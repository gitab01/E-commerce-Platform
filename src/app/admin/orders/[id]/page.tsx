import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import { STATUS_LABELS, canTransition } from '@/lib/order-state';
import { AdminStatusControl } from '@/components/admin-status-control';
import type { OrderStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

const ALL_STATUSES = Object.keys(STATUS_LABELS) as OrderStatus[];

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order
    .findUnique({
      where: { id },
      include: {
        items: true,
        events: { orderBy: { createdAt: 'desc' } },
        user: { select: { email: true, name: true } },
      },
    })
    .catch(() => null);
  if (!order) notFound();

  const nextOptions = ALL_STATUSES.filter((candidate) => canTransition(order.status, candidate));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/orders" className="text-xs text-neutral-500 underline-offset-4 hover:underline">
            All orders
          </Link>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            {order.reference}
            <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700">
              {STATUS_LABELS[order.status]}
            </span>
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            {order.email} · {order.fullName ?? 'no name captured'} · {order.city}, {order.country}
          </p>
        </div>
        <AdminStatusControl
          orderId={order.id}
          reference={order.reference}
          current={order.status}
          options={nextOptions.map((value) => ({ value, label: STATUS_LABELS[value] }))}
        />
      </div>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_18rem]">
        <div>
          <h2 className="text-sm font-semibold">Line items</h2>
          <ul className="mt-3 divide-y divide-neutral-200 border-y border-neutral-200 text-sm">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-neutral-900">{item.title}</span>
                  <span className="text-xs text-neutral-500">
                    {item.variantName} · <span className="font-mono">{item.sku}</span> · {item.quantity} ×{' '}
                    {formatMoney(item.unitPriceCents)}
                  </span>
                </span>
                <span className="tabular-nums">{formatMoney(item.unitPriceCents * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-600">Subtotal</dt>
              <dd className="tabular-nums">{formatMoney(order.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-600">Delivery</dt>
              <dd className="tabular-nums">{formatMoney(order.shippingCents)}</dd>
            </div>
            <div className="flex justify-between font-medium">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatMoney(order.totalCents)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-neutral-500">
            Prices are the values copied at purchase time, so later catalogue edits cannot rewrite this order.
          </p>
        </div>

        <aside className="rounded-lg border border-neutral-200 p-4 text-sm">
          <h2 className="text-sm font-semibold">Payment</h2>
          <dl className="mt-3 space-y-2 text-xs">
            <Row label="Provider" value={order.provider} />
            <Row label="Session" value={order.providerSessionId ?? '—'} mono />
            <Row label="Currency" value={order.currency} />
            <Row label="Reserved" value={stamp(order.reservedAt)} />
            <Row label="Expires" value={stamp(order.expiresAt)} />
            <Row label="Paid" value={order.paidAt ? stamp(order.paidAt) : 'not yet'} />
            <Row label="Shipped" value={order.shippedAt ? stamp(order.shippedAt) : '—'} />
            <Row label="Account" value={order.user?.email ?? 'guest'} />
          </dl>
          <Link href={`/order/${order.reference}`} className="mt-4 block text-xs underline-offset-4 hover:underline">
            Customer view
          </Link>
        </aside>
      </section>

      <section>
        <h2 className="text-sm font-semibold">Audit trail</h2>
        <ul className="mt-3 divide-y divide-neutral-200 border-y border-neutral-200 text-sm">
          {order.events.map((event) => (
            <li key={event.id} className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-[9rem_8rem_1fr]">
              <span className="text-xs tabular-nums text-neutral-500">{stamp(event.createdAt)}</span>
              <span className="text-xs text-neutral-700">{event.actor}</span>
              <span className="text-sm text-neutral-900">
                {event.from ?? '—'} → {event.to ?? 'rejected'}
                {event.note ? <span className="text-neutral-500"> · {event.note}</span> : null}
              </span>
            </li>
          ))}
          {order.events.length === 0 && <li className="py-4 text-sm text-neutral-500">Nothing recorded.</li>}
        </ul>
      </section>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-neutral-500">{label}</dt>
      <dd className={`truncate text-right text-neutral-900 ${mono ? 'font-mono text-[11px]' : ''}`}>{value}</dd>
    </div>
  );
}

function stamp(value: Date) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeStyle: 'short' }).format(value);
}
