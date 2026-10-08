import Link from 'next/link';
import { prisma } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import { STATUS_LABELS, STATUS_TONES } from '@/lib/order-state';
import type { OrderStatus } from '@prisma/client';
import { AdminStat } from '@/components/admin-stat';
import { RunReconciliation } from '@/components/run-reconciliation';

export const dynamic = 'force-dynamic';

export default async function AdminOverview() {
  const [revenue, byStatus, lowStock, recent, reservations, reservedUnits] = await Promise.all([
    prisma.order.aggregate({
      where: { status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] } },
      _sum: { totalCents: true },
      _count: true,
    }),
    prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.variant.findMany({
      where: { stock: { lte: 3 } },
      include: { product: { select: { title: true, slug: true } } },
      orderBy: { stock: 'asc' },
      take: 8,
    }),
    prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 8, include: { items: true } }),
    prisma.order.aggregate({
      where: { status: 'PENDING' },
      _sum: { totalCents: true },
      _count: true,
    }),
    prisma.orderItem.aggregate({
      where: { order: { status: 'PENDING' } },
      _sum: { quantity: true },
    }),
  ]);

  const counts = new Map<OrderStatus, number>(
    byStatus.map((row) => [row.status, row._count._all] as [OrderStatus, number]),
  );

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Revenue counts orders the gateway has confirmed. Reservations are excluded until a webhook says they were
          paid.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <AdminStat label="Confirmed revenue" value={formatMoney(revenue._sum.totalCents ?? 0)} />
          <AdminStat label="Paid orders" value={String(revenue._count)} />
          <AdminStat label="Reserved value" value={formatMoney(reservations._sum.totalCents ?? 0)} />
          <AdminStat label="Units reserved" value={String(reservedUnits._sum.quantity ?? 0)} hint="released on timeout" />
        </div>
      </section>

      <section className="card">
        <h2 className="eyebrow border-b border-line px-5 py-3">Orders by status</h2>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-3 p-5 sm:grid-cols-3 lg:grid-cols-6">
          {(Object.keys(STATUS_LABELS) as (keyof typeof STATUS_LABELS)[]).map((status) => (
            <li key={status} className="flex items-center justify-between gap-3">
              <span className="pill pill-neutral">{STATUS_LABELS[status]}</span>
              <span className="text-sm font-semibold tabular-nums">{counts.get(status) ?? 0}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 className="text-sm font-semibold">Latest orders</h2>
            <Link href="/admin/orders" className="text-sm text-neutral-600 underline-offset-4 hover:underline">
              All orders
            </Link>
          </div>
          <ul className="divide-y divide-line text-sm">
            {recent.map((order) => (
              <li key={order.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="shrink-0 font-medium tabular-nums underline-offset-4 hover:underline"
                >
                  {order.reference}
                </Link>
                <span className="min-w-0 flex-1 truncate text-xs text-neutral-500">{order.email}</span>
                <span className="shrink-0 tabular-nums">{formatMoney(order.totalCents)}</span>
                <span className={`pill shrink-0 ${STATUS_TONES[order.status]}`}>{STATUS_LABELS[order.status]}</span>
              </li>
            ))}
            {recent.length === 0 && <li className="px-5 py-6 text-sm text-neutral-500">No orders yet.</li>}
          </ul>
        </div>

        <div className="card">
          <h2 className="border-b border-line px-5 py-3 text-sm font-semibold">Low or zero stock</h2>
          <ul className="divide-y divide-line text-sm">
            {lowStock.map((variant) => (
              <li key={variant.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <Link
                  href={`/products/${variant.product.slug}`}
                  className="min-w-0 flex-1 truncate underline-offset-4 hover:underline"
                >
                  {variant.product.title} — {variant.name}
                </Link>
                <span className="hidden font-mono text-xs text-neutral-500 sm:block">{variant.sku}</span>
                <span
                  className={`pill shrink-0 tabular-nums ${variant.stock === 0 ? 'pill-danger' : 'pill-neutral'}`}
                >
                  {variant.stock === 0 ? 'Sold out' : `${variant.stock} left`}
                </span>
              </li>
            ))}
            {lowStock.length === 0 && (
              <li className="px-5 py-6 text-sm text-neutral-500">Everything has healthy stock.</li>
            )}
          </ul>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-semibold">Reservations</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Vercel Cron runs reconciliation on a schedule. Running it here is the same code path, useful right after a
          test checkout.
        </p>
        <RunReconciliation />
      </section>
    </div>
  );
}
