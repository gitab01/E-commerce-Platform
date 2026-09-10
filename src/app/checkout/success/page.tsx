import Link from 'next/link'
import { CheckCircle, Package, ArrowRight } from 'lucide-react'
import { formatPrice, formatDate } from '@/lib/utils'
import prisma from '@/lib/prisma'

interface Props {
  searchParams: { orderId?: string; provider?: string }
}

async function getOrder(orderId: string) {
  try {
    return await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    })
  } catch {
    return null
  }
}

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const order = searchParams.orderId ? await getOrder(searchParams.orderId) : null

  return (
    <div className="container flex items-center justify-center py-16 min-h-[60vh]">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-50 border-4 border-green-100">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Order Confirmed!</h1>
          <p className="text-muted-foreground">
            Thank you for your purchase. We&apos;ve received your order and will process it shortly.
          </p>
        </div>

        {order && (
          <div className="rounded-xl border border-border bg-card p-6 text-left space-y-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <span className="font-semibold text-sm">Order Details</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Number</span>
                <span className="font-mono font-medium">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span>{formatDate(order.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items</span>
                <span>{order.items.length} item(s)</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-semibold">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {order && (
            <Link
              href="/orders"
              className="h-12 rounded-lg bg-primary text-primary-foreground px-6 text-base font-medium hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2"
            >
              <Package className="h-4 w-4" /> Track My Order
            </Link>
          )}
          <Link
            href="/products"
            className="h-12 rounded-lg border border-input bg-background px-6 text-base font-medium hover:bg-accent transition-colors inline-flex items-center justify-center gap-2"
          >
            Continue Shopping <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          A confirmation email will be sent to your registered email address.
        </p>
      </div>
    </div>
  )
}
