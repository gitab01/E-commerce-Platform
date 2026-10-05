import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import { currentUser } from '@/lib/auth';
import { STATUS_LABELS } from '@/lib/order-state';
import { StatusTimeline, type TimelineStep } from '@/components/status-timeline';
import { ResumePayment } from '@/components/resume-payment';
import { OfferAccount } from '@/components/offer-account';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  return { title: `Order ${reference}` };
}

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ paid?: string; cancelled?: string }>;
}) {
  const [{ reference }, query] = await Promise.all([params, searchParams]);
  const order = await prisma.order.findUnique({
    where: { reference },
    include: { items: true, events: { orderBy: { createdAt: 'asc' } } },
  });
  if (!order) notFound();

  const user = await currentUser();
  const now = new Date();
  const steps: TimelineStep[] = [
    { status: 'PENDING', label: STATUS_LABELS.PENDING, at: order.reservedAt, done: true, current: order.status === 'PENDING' },
    { status: 'PAID', label: STATUS_LABELS.PAID, at: order.paidAt, done: Boolean(order.paidAt), current: order.status === 'PAID' },
    { status: 'SHIPPED', label: STATUS_LABELS.SHIPPED, at: order.shippedAt, done: Boolean(order.shippedAt), current: order.status === 'SHIPPED' },
    {
      status: 'DELIVERED',
      label: STATUS_LABELS.DELIVERED,
      at: order.deliveredAt,
      done: Boolean(order.deliveredAt),
      current: order.status === 'DELIVERED',
    },
  ];

  return (
    <div className="container-page max-w-3xl py-10">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Order</p>
      <h1 className="mt-2 flex flex-wrap items-baseline gap-3 text-2xl font-semibold tracking-tight">
        {order.reference}
        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700">
          {STATUS_LABELS[order.status]}
        </span>
      </h1>
      <p className="mt-1 text-sm text-neutral-600">
        Placed {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(order.reservedAt)} by {order.email}
      </p>

      {(query.paid || order.status !== 'PENDING') && order.status === 'PAID' && (
        <p className="mt-4 rounded-md bg-neutral-100 p-3 text-sm text-neutral-800">
          Payment confirmed. You will get another update when this order ships.
        </p>
      )}
      {query.cancelled && order.status === 'PENDING' && (
        <p className="mt-4 rounded-md border border-neutral-300 p-3 text-sm text-neutral-800">
          You left the payment page. Stock is still reserved until{' '}
          {new Intl.DateTimeFormat('en-GB', { timeStyle: 'short' }).format(order.expiresAt)} — after that it goes back
          on the shelf automatically.
        </p>
      )}

      {order.status === 'PENDING' && order.expiresAt > now && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <ResumePayment reference={order.reference} />
          <span className="text-sm text-neutral-600">
            Reservation expires in {Math.max(0, Math.round((order.expiresAt.getTime() - now.getTime()) / 60000))} minutes
          </span>
        </div>
      )}
      {(order.status === 'EXPIRED' || order.status === 'CANCELLED') && (
        <div className="mt-6">
          <p className="text-sm text-neutral-700">
            {order.events.filter((event) => event.note).at(-1)?.note ??
              'The reservation lapsed and the stock went back to the catalogue.'}
          </p>
          <Link href="/products" className="mt-3 inline-block text-sm underline-offset-4 hover:underline">
            Browse products again
          </Link>
        </div>
      )}

      <section className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold">Progress</h2>
          <div className="mt-4">
            <StatusTimeline steps={steps} />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold">Items</h2>
          <ul className="mt-3 divide-y divide-neutral-200 border-y border-neutral-200 text-sm">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 py-2">
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
          <p className="mt-3 text-xs text-neutral-500">
            Paid through {order.provider.toLowerCase()} · reference {order.providerSessionId ?? order.reference}
          </p>
        </div>
      </section>

      {order.status === 'PAID' && !user && <OfferAccount email={order.email} />}

      {order.events.length > 0 && (
        <section className="mt-12 border-t border-neutral-200 pt-6">
          <h2 className="text-sm font-semibold">History</h2>
          <ul className="mt-3 space-y-1 text-xs text-neutral-600">
            {order.events.map((event) => (
              <li key={event.id} className="flex gap-3">
                <span className="tabular-nums text-neutral-400">
                  {new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeStyle: 'short' }).format(event.createdAt)}
                </span>
                <span>
                  {event.actor}: {event.from ?? '—'} → {event.to ?? event.note}
                  {event.note && event.to ? ` (${event.note})` : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
