import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { demoGateway } from '@/lib/payments/demo';
import { formatMoney } from '@/lib/money';
import { DemoPayButtons } from '@/components/demo-pay-buttons';

export const dynamic = 'force-dynamic';

/**
 * Stands in for the hosted gateway page when DEMO_PAYMENTS=true. Confirmation
 * still runs through the fulfilment service on the server, so no code path lets
 * the browser declare a payment complete.
 */
export default async function DemoPayPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ reference?: string }>;
}) {
  if (!demoGateway.isConfigured()) redirect('/');
  await params;
  const { reference } = await searchParams;
  if (!reference) redirect('/');

  const order = await prisma.order.findUnique({
    where: { reference },
    include: { items: true },
  });
  if (!order) redirect('/');

  return (
    <div className="container-page max-w-xl py-12">
      <p className="eyebrow">Demo gateway</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        Confirm payment for <span className="tabular-nums">{order.reference}</span>
      </h1>

      <dl className="card mt-6 divide-y divide-line text-sm">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between gap-4 px-5 py-3">
            <dt className="min-w-0 truncate text-neutral-700">
              {item.quantity} × {item.title} ({item.variantName})
            </dt>
            <dd className="tabular-nums">{formatMoney(item.unitPriceCents * item.quantity)}</dd>
          </div>
        ))}
        <div className="flex justify-between px-5 py-3.5 font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatMoney(order.totalCents)}</dd>
        </div>
      </dl>

      {order.status === 'PENDING' ? (
        <DemoPayButtons reference={order.reference} />
      ) : (
        <p className="card mt-6 p-4 text-sm text-neutral-700">
          This order is no longer awaiting payment ({order.status.toLowerCase()}).
        </p>
      )}
      <Link href={`/order/${order.reference}`} className="mt-6 block text-sm text-neutral-600 underline-offset-4 hover:underline">
        View the order
      </Link>

      <p className="mt-6 text-xs leading-5 text-neutral-500">
        Nothing is charged. This button triggers the same server-side fulfilment path that a verified Chapa or Stripe
        webhook would.
      </p>
    </div>
  );
}
