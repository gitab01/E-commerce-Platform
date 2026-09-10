import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { generateOrderNumber, generateTxRef } from '@/lib/utils'
import { initiateChapaPayment } from '@/lib/chapa'
import { initiateArifPaySession, buildArifPayPayload } from '@/lib/arifpay'
import { stripe } from '@/lib/stripe'

const SHIPPING_THRESHOLD = 2000
const SHIPPING_COST = 150
const TAX_RATE = 0.15

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orders = await prisma.order.findMany({
      where: session.user.role === 'ADMIN' ? {} : { userId: session.user.id },
      include: {
        items: { include: { product: { select: { images: true } } } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(orders)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { items, shippingAddress, paymentMethod, notes } = await req.json()

    if (!items?.length) return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })

    // Validate products and calculate totals
    const productIds = items.map((i: any) => i.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, published: true },
    })

    const productMap = new Map(products.map((p) => [p.id, p]))
    let subtotal = 0
    const validatedItems = []

    for (const item of items) {
      const product = productMap.get(item.productId)
      if (!product) return NextResponse.json({ error: `Product not found: ${item.productId}` }, { status: 400 })
      if (product.stock < item.quantity) return NextResponse.json({ error: `Insufficient stock for ${product.name}` }, { status: 400 })
      subtotal += product.price * item.quantity
      validatedItems.push({ product, quantity: item.quantity })
    }

    const shippingCost = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
    const tax = subtotal * TAX_RATE
    const total = subtotal + shippingCost + tax
    const orderNumber = generateOrderNumber()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Map payment method to provider
    const isChapa = paymentMethod.startsWith('chapa_')
    const isArifPay = paymentMethod === 'arifpay'
    const isStripe = paymentMethod === 'stripe'

    // Determine DB payment method enum
    const paymentMethodMap: Record<string, string> = {
      chapa_telebirr: 'TELEBIRR', chapa_cbe: 'CBE', chapa_boa: 'BOA',
      chapa_awash: 'AWASH', chapa_dashen: 'DASHEN', chapa_abyssinia: 'ABYSSINIA',
      chapa_united: 'UNITED', chapa_oromia: 'OROMIA', chapa_nib: 'NIBE',
      chapa_berhan: 'BERHAN', chapa_bunna: 'BUNNA', chapa_zemen: 'ZEMEN',
      chapa_enat: 'ENAT', arifpay: 'ARIFPAY', stripe: 'STRIPE',
    }

    // Create order in DB
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: session.user.id,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: (paymentMethodMap[paymentMethod] || 'CHAPA') as any,
        subtotal,
        shippingCost,
        tax,
        total,
        shippingAddress,
        notes: notes || null,
        items: {
          create: validatedItems.map(({ product, quantity }) => ({
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity,
            image: product.images[0] || null,
          })),
        },
      },
    })

    // Reduce stock
    await Promise.all(
      validatedItems.map(({ product, quantity }) =>
        prisma.product.update({
          where: { id: product.id },
          data: { stock: { decrement: quantity } },
        })
      )
    )

    // Process payment
    if (isChapa) {
      const chapaMethod = paymentMethod.replace('chapa_', '')
      const txRef = generateTxRef('SHG')

      // Save txRef to order
      await prisma.order.update({ where: { id: order.id }, data: { paymentId: txRef } })

      const result = await initiateChapaPayment({
        amount: Math.round(total),
        currency: 'ETB',
        email: shippingAddress.email,
        first_name: shippingAddress.firstName,
        last_name: shippingAddress.lastName,
        phone_number: shippingAddress.phone,
        tx_ref: txRef,
        callback_url: `${appUrl}/api/webhooks/chapa`,
        return_url: `${appUrl}/checkout/success?orderId=${order.id}&provider=chapa`,
        customization: {
          title: 'Shega Market',
          description: `Order ${orderNumber}`,
        },
      })

      if (!result.success) {
        return NextResponse.json({ error: result.message || 'Payment initialization failed' }, { status: 500 })
      }

      return NextResponse.json({ orderId: order.id, checkoutUrl: result.checkoutUrl })
    }

    if (isArifPay) {
      const payload = buildArifPayPayload(
        {
          id: order.id,
          total: Math.round(total),
          items: validatedItems.map(({ product, quantity }) => ({
            name: product.name,
            price: product.price,
            quantity,
            image: product.images[0],
          })),
        },
        process.env.ARIFPAY_MERCHANT_ID || '1000'
      )

      const result = await initiateArifPaySession(payload)

      if (!result.success) {
        return NextResponse.json({ error: result.message || 'ArifPay initialization failed' }, { status: 500 })
      }

      await prisma.order.update({ where: { id: order.id }, data: { paymentId: result.transactionId } })
      return NextResponse.json({ orderId: order.id, checkoutUrl: result.checkoutUrl })
    }

    if (isStripe) {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(total * 100), // Stripe uses cents
        currency: 'usd',
        metadata: { orderId: order.id, orderNumber },
      })

      await prisma.order.update({ where: { id: order.id }, data: { paymentId: paymentIntent.id } })
      return NextResponse.json({ orderId: order.id, clientSecret: paymentIntent.client_secret })
    }

    return NextResponse.json({ orderId: order.id })
  } catch (error) {
    console.error('Order creation error:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
