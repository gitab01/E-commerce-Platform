import { NextResponse } from 'next/server'
import { verifyChapaPayment } from '@/lib/chapa'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { tx_ref, status } = body

    if (!tx_ref) return NextResponse.json({ error: 'Missing tx_ref' }, { status: 400 })

    // Verify with Chapa API
    const verification = await verifyChapaPayment(tx_ref)

    const order = await prisma.order.findFirst({ where: { paymentId: tx_ref } })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    if (verification.success && verification.status === 'success') {
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'PAID', status: 'PROCESSING' },
      })
    } else {
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'FAILED' },
      })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Chapa webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
