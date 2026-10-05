import Link from 'next/link';
import { prisma } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import { STATUS_LABELS } from '@/lib/order-state';
import type { OrderStatus } from '@prisma/client';
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
  const held = reservations._count;

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Revenue counts orders the gateway has confirmed. Reservations are excluded until a webhook says they were
          paid.
        </p>
        <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Confirmed revenue" value={formatMoney(revenue._sum.totalCents ?? 0)} />
          <Stat label="Paid orders" value={String(revenue._count)} />
          <Stat label="Awaiting payment" value={String(held)} hint={formatMoney(reservations._sum.totalCents ?? 0)} />
          <Stat label="Units reserved" value={String(reservedUnits._sum.quantity ?? 0)} hint="released on timeout" />
        </dl>
      </section>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {(Object.keys(STATUS_LABELS) as (keyof typeof STATUS_LABELS)[]).map((status) => (
          <div key={status} className="rounded-lg border border-neutral-200 p-3">
            <p className="text-xs text-neutral-500">{STATUS_LABELS[status]}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{counts.get(status) ?? 0}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Latest orders</h2>
            <Link href="/admin/orders" className="text-sm text-neutral-600 underline-offset-4 hover:underline">
              All orders
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-neutral-200 border-y border-neutral-200 text-sm">
            {recent.map((order) => (
              <li key={order.id} className="flex items-center justify-between gap-3 py-2.5">
                <Link href={`/admin/orders/${order.id}`} className="min-w-0 truncate font-medium underline-offset-4 hover:underline">
                  {order.reference}
                </Link>
                <span className="hidden truncate text-xs text-neutral-500 sm:block">{order.email}</span>
                <span className="tabular-nums">{formatMoney(order.totalCents)}</span>
                <span className="w-28 truncate text-right text-xs text-neutral-600">{STATUS_LABELS[order.status]}</span>
              </li>
            ))}
            {recent.length === 0 && <li className="py-4 text-sm text-neutral-500">No orders yet.</li>}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold">Low or zero stock</h2>
          <ul className="mt-3 divide-y divide-neutral-200 border-y border-neutral-200 text-sm">
            {lowStock.map((variant) => (
              <li key={variant.id} className="flex items-center justify-between gap-3 py-2.5">
                <Link href={`/products/${variant.product.slug}`} className="min-w-0 truncate underline-offset-4 hover:underline">
                  {variant.product.title} — {variant.name}
                </Link>
                <span className="font-mono text-xs text-neutral-500">{variant.sku}</span>
                <span className={`tabular-nums ${variant.stock === 0 ? 'font-semibold text-neutral-900' : 'text-neutral-600'}`}>
                  {variant.stock}
                </span>
              </li>
            ))}
            {lowStock.length === 0 && <li className="py-4 text-sm text-neutral-500">Everything has healthy stock.</li>}
          </ul>
        </div>
      </section>

      <section className="rounded-lg border border-neutral-200 p-5">
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

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight">{value}</p>
      {hint && <p className="text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}
