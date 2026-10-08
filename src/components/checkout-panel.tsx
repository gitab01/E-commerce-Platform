import Link from 'next/link';
import { formatMoney } from '@/lib/money';

export function CheckoutPanel({
  totals,
  providers,
}: {
  totals: { subtotalCents: number; shippingCents: number; totalCents: number };
  providers?: { id: 'CHAPA' | 'STRIPE' | 'DEMO'; label: string; hint: string }[];
}) {
  return (
    <aside className="card h-fit p-5">
      <h2 className="text-sm font-semibold text-ink">Summary</h2>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-neutral-600">Subtotal</dt>
          <dd className="tabular-nums">{formatMoney(totals.subtotalCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-neutral-600">Delivery</dt>
          <dd className="tabular-nums">
            {totals.shippingCents === 0 ? <span className="text-ink">Free</span> : formatMoney(totals.shippingCents)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <dt className="text-sm font-medium text-ink">Total</dt>
          <dd className="text-lg font-semibold tabular-nums tracking-tight text-ink">{formatMoney(totals.totalCents)}</dd>
        </div>
      </dl>
      {providers && providers.length === 0 && (
        <p className="card mt-4 flex flex-col items-start gap-2 p-3 text-xs leading-5 text-neutral-600">
          <span className="pill pill-neutral">Checkout closed</span>
          No payment gateway is configured on this deployment yet. Set CHAPA_SECRET_KEY or STRIPE_SECRET_KEY to open it.
        </p>
      )}
      <Link href="/checkout" className="btn btn-primary btn-block mt-5">
        Checkout
      </Link>
      <p className="mt-3 text-xs leading-5 text-neutral-500">
        Starting checkout reserves the stock for 30 minutes. If payment does not finish, the units return to the
        catalogue automatically.
      </p>
    </aside>
  );
}
