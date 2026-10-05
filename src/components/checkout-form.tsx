'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitCheckout } from '@/app/actions/checkout';

type Provider = { id: 'CHAPA' | 'STRIPE' | 'DEMO'; label: string; hint: string };

const FAILURE_COPY: Record<string, string> = {
  OUT_OF_STOCK: 'Someone just bought the last one. Remove or reduce the item that sold out and try again.',
  EMPTY_CART: 'Your cart emptied while you were filling this in.',
  PROVIDER_UNAVAILABLE: 'That payment method is not enabled on this deployment.',
  PAYMENT_SETUP_FAILED: 'Your stock is still reserved, but the payment page could not be created. Try once more.',
  INVALID_INPUT: 'Check the highlighted fields.',
};

export function CheckoutForm({
  providers,
  defaults,
}: {
  providers: Provider[];
  defaults: { email: string; fullName: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [provider, setProvider] = useState<Provider['id']>(providers[0].id);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await submitCheckout({
        email: String(form.get('email') ?? ''),
        fullName: String(form.get('fullName') ?? ''),
        phone: String(form.get('phone') ?? '') || undefined,
        addressLine: String(form.get('addressLine') ?? ''),
        city: String(form.get('city') ?? ''),
        provider,
      });
      if (result.ok) {
        // The gateway owns the payment step from here; the redirect is cosmetic.
        window.location.assign(result.redirectTo);
        return;
      }
      if (result.fields) setFieldErrors(result.fields);
      setError(FAILURE_COPY[result.reason] ?? 'Checkout failed. Nothing has been charged.');
      if (result.reason === 'OUT_OF_STOCK') router.refresh();
    });
  }

  const field = 'mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900';

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <section className="rounded-lg border border-neutral-200 p-5">
        <h2 className="text-sm font-semibold">Contact</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-xs text-neutral-600">
            Email
            <input name="email" type="email" required defaultValue={defaults.email} className={field} autoComplete="email" />
          </label>
          <label className="text-xs text-neutral-600">
            Phone (optional)
            <input name="phone" type="tel" defaultValue="" className={field} autoComplete="tel" placeholder="+251…" />
          </label>
        </div>
        {fieldErrors.email && <p className="mt-2 text-xs text-red-700">Enter a valid email address.</p>}
      </section>

      <section className="rounded-lg border border-neutral-200 p-5">
        <h2 className="text-sm font-semibold">Delivery</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-xs text-neutral-600 sm:col-span-2">
            Full name
            <input name="fullName" required minLength={2} defaultValue={defaults.fullName} className={field} />
          </label>
          <label className="text-xs text-neutral-600 sm:col-span-2">
            Address
            <input name="addressLine" required minLength={4} className={field} autoComplete="street-address" />
          </label>
          <label className="text-xs text-neutral-600">
            City
            <input name="city" required minLength={2} defaultValue="Addis Ababa" className={field} />
          </label>
        </div>
      </section>

      <fieldset className="rounded-lg border border-neutral-200 p-5">
        <legend className="text-sm font-semibold">Pay with</legend>
        <div className="mt-3 flex flex-col gap-2">
          {providers.map((entry) => (
            <label
              key={entry.id}
              className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm ${
                provider === entry.id ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              <input
                type="radio"
                name="provider"
                value={entry.id}
                checked={provider === entry.id}
                onChange={() => setProvider(entry.id)}
                className="mt-0.5"
              />
              <span>
                <span className="block font-medium text-neutral-950">{entry.label}</span>
                <span className="block text-xs text-neutral-600">{entry.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-5 py-3 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
      >
        {pending ? 'Reserving stock…' : 'Continue to payment'}
      </button>
      <p className="text-xs leading-5 text-neutral-500">
        Clicking continue starts a 30-minute stock reservation. You are charged only after you confirm on the payment
        page, and the order is marked paid only when the gateway tells us so.
      </p>
    </form>
  );
}
