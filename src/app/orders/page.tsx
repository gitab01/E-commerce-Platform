import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { formatPrice, formatDate, getStatusColor } from '@/lib/utils'
import prisma from '@/lib/prisma'

export const metadata: Metadata = { title: 'My Orders' }

async function getUserOrders(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    include: {
      items: {
        include: { product: { select: { images: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export default async function OrdersPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login?callbackUrl=/orders')

  const orders = await getUserOrders(session.user.id)

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Orders</h1>
        <Link
          href="/products"
          className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent transition-colors"
        >
          Continue Shopping
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-7xl mb-6">📦</div>
          <h2 className="text-xl font-bold mb-2">No orders yet</h2>
          <p className="text-muted-foreground mb-6">Start shopping to see your orders here.</p>
          <Link
            href="/products"
            className="h-12 rounded-lg bg-primary text-primary-foreground px-6 text-base font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
          >
            Browse Products <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/30 px-5 py-3 border-b border-border">
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Order</p>
                    <p className="font-mono font-medium">{order.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-medium">{formatDate(order.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-bold">{formatPrice(order.total)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusColor(order.paymentStatus)}`}>
                    {order.paymentStatus}
                  </span>
                </div>
              </div>
              <div className="px-5 py-4">
                <div className="flex flex-wrap gap-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 text-sm">
                      {item.product.images[0] && (
                        <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted border border-border shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.product.images[0]} alt={item.name} className="h-full w-full object-cover" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium line-clamp-1">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity}x {formatPrice(item.price)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
