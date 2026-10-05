import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { peekCartSessionId } from '@/lib/cart-session';
import { totalsFor, type CartLine } from '@/lib/checkout';
import { currentUser } from '@/lib/auth';
import { availableProviders } from '@/lib/payments';
import { CheckoutForm } from '@/components/checkout-form';
import { formatMoney } from '@/lib/money';
import type { PaymentProvider } from '@prisma/client';

export const dynamic = 'force-dynamic';

const PROVIDER_COPY: Record<PaymentProvider, { label: string; hint: string }> = {
  CHAPA: { label: 'Chapa', hint: 'telebirr, CBE Birr, or an Ethiopian-issued card' },
  STRIPE: { label: 'Card via Stripe', hint: 'international Visa and Mastercard' },
  DEMO: { label: 'Demo payment', hint: 'completes the flow without charging anything' },
};

async function loadLines(): Promise<CartLine[]> {
  const sessionId = await peekCartSessionId();
  if (!sessionId) return [];
  const cart = await prisma.cart.findUnique({
    where: { sessionId },
    include: {
      items: { include: { variant: { include: { product: { select: { title: true, active: true } } } } } },
    },
  });
  return (cart?.items ?? [])
    .filter((item) => item.variant.product.active)
    .map((item) => ({
      variantId: item.variant.id,
      sku: item.variant.sku,
      title: item.variant.product.title,
      variantName: item.variant.name,
      quantity: item.quantity,
      unitPriceCents: item.variant.priceCents,
      stock: item.variant.stock,
    }));
}

export default async function CheckoutPage() {
  const lines = await loadLines();
  if (lines.length === 0) redirect('/cart');

  const totals = totalsFor(lines);
  const user = await currentUser();
  const providers = availableProviders().map((id) => ({ id, ...PROVIDER_COPY[id] }));

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Guest checkout — an account is offered after payment, when there is a reason to come back.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_20rem]">
        {providers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-300 p-6">
            <h2 className="text-sm font-semibold text-neutral-950">No payment gateway configured</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Add CHAPA_SECRET_KEY or STRIPE_SECRET_KEY to the environment, or set DEMO_PAYMENTS=true to walk through
              the flow without credentials.
            </p>
            <Link href="/products" className="mt-4 inline-block text-sm underline-offset-4 hover:underline">
              Back to the catalogue
            </Link>
          </div>
        ) : (
          <CheckoutForm
            providers={providers}
            defaults={{ email: user?.email ?? '', fullName: user?.name ?? '' }}
          />
        )}

        <aside className="h-fit rounded-lg border border-neutral-200 p-5">
          <h2 className="text-sm font-semibold">Order total</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {lines.map((line) => (
              <li key={line.variantId} className="flex justify-between gap-3">
                <span className="min-w-0 truncate text-neutral-700">
                  {line.quantity} × {line.title} <span className="text-neutral-400">({line.variantName})</span>
                </span>
                <span className="tabular-nums">{formatMoney(line.unitPriceCents * line.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-neutral-200 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-600">Subtotal</dt>
              <dd className="tabular-nums">{formatMoney(totals.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-600">Delivery</dt>
              <dd className="tabular-nums">{formatMoney(totals.shippingCents)}</dd>
            </div>
            <div className="flex justify-between font-medium">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatMoney(totals.totalCents)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-5 text-neutral-500">
            These totals are recomputed from the database inside the checkout transaction. The amounts shown here are
            what you pay, not what the browser sends.
          </p>
        </aside>
      </div>
    </div>
  );
}
