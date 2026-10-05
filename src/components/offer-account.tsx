'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createAccountAfterPayment } from '@/app/actions/account';

/**
 * Account creation is offered after payment, when the customer already has a
 * reason to return — it is never a gate in front of checkout.
 */
export function OfferAccount({ email }: { email: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <section className="mt-12 rounded-lg border border-neutral-200 p-5">
      <h2 className="text-sm font-semibold">Keep an account for next time</h2>
      <p className="mt-1 text-xs text-neutral-600">
        Set a password on {email} to see past orders and reorder in one tap.
      </p>
      <form
        className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          startTransition(async () => {
            const result = await createAccountAfterPayment({
              email,
              password: String(form.get('password') ?? ''),
              name: String(form.get('name') ?? '') || undefined,
            });
            setMessage(result.ok ? 'Account created — this page now shows your order history.' : 'That did not work; the email may already have an account.');
            if (result.ok) router.refresh();
          });
        }}
      >
        <label className="text-xs text-neutral-600">
          Name
          <input name="name" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm sm:w-40" />
        </label>
        <label className="text-xs text-neutral-600">
          Password (8+ characters)
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm sm:w-56"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 whitespace-nowrap rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
        >
          {pending ? 'Creating…' : 'Create account'}
        </button>
      </form>
      {message && <p role="status" className="mt-3 text-xs text-neutral-700">{message}</p>}
    </section>
  );
}
