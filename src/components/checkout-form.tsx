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

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <section className="card p-5">
        <h2 className="text-sm font-semibold text-ink">
          <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">1</span>
          Contact
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="label">
            Email
            <input name="email" type="email" required defaultValue={defaults.email} className="field" autoComplete="email" />
          </label>
          <label className="label">
            Phone (optional)
            <input name="phone" type="tel" defaultValue="" className="field" autoComplete="tel" placeholder="+251…" />
          </label>
        </div>
        {fieldErrors.email && <p className="mt-2 text-xs text-danger">Enter a valid email address.</p>}
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-semibold text-ink">
          <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">2</span>
          Delivery
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="label sm:col-span-2">
            Full name
            <input name="fullName" required minLength={2} defaultValue={defaults.fullName} className="field" autoComplete="name" />
          </label>
          <label className="label sm:col-span-2">
            Address
            <input name="addressLine" required minLength={4} className="field" autoComplete="street-address" />
          </label>
          <label className="label">
            City
            <input name="city" required minLength={2} defaultValue="Addis Ababa" className="field" autoComplete="address-level2" />
          </label>
        </div>
      </section>

      <fieldset className="card p-5">
        <legend className="text-sm font-semibold text-ink">
          <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white align-middle">3</span>
          Pay with
        </legend>
        <div className="mt-4 flex flex-col gap-2">
          {providers.map((entry) => (
            <label
              key={entry.id}
              className={`flex cursor-pointer items-start gap-3 rounded-md border p-3.5 text-sm transition-colors ${
                provider === entry.id ? 'border-ink' : 'border-line hover:border-neutral-400'
              }`}
            >
              <input
                type="radio"
                name="provider"
                value={entry.id}
                checked={provider === entry.id}
                onChange={() => setProvider(entry.id)}
                className="mt-1 accent-neutral-900"
              />
              <span className="min-w-0">
                <span className="block font-medium text-ink">{entry.label}</span>
                <span className="mt-0.5 block text-xs leading-5 text-neutral-600">{entry.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="rounded-md border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
          {error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary btn-block py-3 sm:w-auto sm:px-5">
        {pending ? 'Reserving stock…' : 'Continue to payment'}
      </button>
      <p className="text-xs leading-5 text-neutral-500">
        Clicking continue starts a 30-minute stock reservation. You are charged only after you confirm on the payment
        page, and the order is marked paid only when the gateway tells us so.
      </p>
    </form>
  );
}
