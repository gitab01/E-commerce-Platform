'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteCustomer, deleteProduct, deleteVariant } from '@/app/actions/catalog-admin';

const COPY: Record<string, string> = {
  FORBIDDEN: 'Not permitted.',
  INVALID_ID: 'That record no longer exists.',
  NOT_FOUND: 'That record no longer exists.',
  HAS_SALES: 'It appears in order history, so it cannot be deleted. Hide the product instead.',
  HAS_ORDERS: 'This account has orders attached. Leave it in place so the history stays linked.',
  SELF_CHANGE: 'That is your own account.',
};

const ACTIONS = {
  product: deleteProduct,
  variant: deleteVariant,
  customer: deleteCustomer,
} as const;

/**
 * Two taps, no browser dialog: the first arms the control, the second runs the
 * delete. Anything with sales history is refused by the action, not here.
 */
export function DeleteControl({
  kind,
  id,
  label,
  redirectTo,
}: {
  kind: keyof typeof ACTIONS;
  id: string;
  label: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <span className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!armed) {
            setArmed(true);
            setMessage(null);
            return;
          }
          setMessage(null);
          startTransition(async () => {
            const result = await ACTIONS[kind](id);
            if (!result.ok) {
              setMessage(COPY[result.reason] ?? 'Failed.');
              setArmed(false);
              return;
            }
            if (redirectTo) router.push(redirectTo);
            else router.refresh();
          });
        }}
        className={`btn ${armed ? 'btn-danger' : 'btn-secondary'} py-1.5`}
      >
        {pending ? 'Deleting…' : armed ? `Confirm: ${label}` : label}
      </button>
      {armed && !pending && (
        <button
          type="button"
          onClick={() => setArmed(false)}
          className="text-xs text-neutral-500 underline-offset-4 hover:underline"
        >
          Cancel
        </button>
      )}
      {message && (
        <span role="alert" className="text-xs text-danger">
          {message}
        </span>
      )}
    </span>
  );
}
