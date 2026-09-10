import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { sessionId, paymentStatus, nonce } = body

    // nonce is the orderId we set when creating the session
    if (!nonce) return NextResponse.json({ error: 'Missing nonce' }, { status: 400 })

    const order = await prisma.order.findUnique({ where: { id: nonce } })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    if (paymentStatus === 'PAID' || paymentStatus === 'SUCCESS') {
      await prisma.order.update({
        where: { id: nonce },
        data: { paymentStatus: 'PAID', status: 'PROCESSING' },
      })
    } else if (paymentStatus === 'FAILED' || paymentStatus === 'DECLINED') {
      await prisma.order.update({
        where: { id: nonce },
        data: { paymentStatus: 'FAILED' },
      })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('ArifPay webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
