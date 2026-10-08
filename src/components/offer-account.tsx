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
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  return (
    <section className="card mt-10 p-5">
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
            setMessage({
              text: result.ok
                ? 'Account created — this page now shows your order history.'
                : 'That did not work; the email may already have an account.',
              ok: result.ok,
            });
            if (result.ok) router.refresh();
          });
        }}
      >
        <label>
          <span className="label">Name</span>
          <input name="name" className="field sm:w-40" />
        </label>
        <label>
          <span className="label">Password (8+ characters)</span>
          <input name="password" type="password" required minLength={8} className="field sm:w-56" />
        </label>
        <button type="submit" disabled={pending} className="btn btn-primary shrink-0 whitespace-nowrap">
          {pending ? 'Creating…' : 'Create account'}
        </button>
      </form>
      {message && (
        <p role="status" className={`mt-3 text-xs ${message.ok ? 'text-success' : 'text-danger'}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}
