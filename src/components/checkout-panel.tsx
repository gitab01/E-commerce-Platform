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
    <aside className="h-fit rounded-lg border border-neutral-200 p-5">
      <h2 className="text-sm font-semibold text-neutral-950">Summary</h2>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-neutral-600">Subtotal</dt>
          <dd className="tabular-nums">{formatMoney(totals.subtotalCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-neutral-600">Delivery</dt>
          <dd className="tabular-nums">
            {totals.shippingCents === 0 ? <span className="text-neutral-900">Free</span> : formatMoney(totals.shippingCents)}
          </dd>
        </div>
        <div className="flex justify-between border-t border-neutral-200 pt-3 font-medium">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatMoney(totals.totalCents)}</dd>
        </div>
      </dl>
      {providers && providers.length === 0 && (
        <p className="mt-4 rounded-md bg-neutral-100 p-3 text-xs text-neutral-700">
          No payment gateway is configured on this deployment yet. Set CHAPA_SECRET_KEY or STRIPE_SECRET_KEY to open
          checkout.
        </p>
      )}
      <Link
        href="/checkout"
        className="mt-5 block rounded-md bg-neutral-900 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-neutral-800"
      >
        Checkout
      </Link>
      <p className="mt-3 text-xs leading-5 text-neutral-500">
        Starting checkout reserves the stock for 30 minutes. If payment does not finish, the units return to the
        catalogue automatically.
      </p>
    </aside>
  );
}
