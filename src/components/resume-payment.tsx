'use client';

import { useTransition } from 'react';
import { resumeCheckout } from '@/app/actions/checkout';

export function ResumePayment({ reference }: { reference: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await resumeCheckout(reference);
          if (result.ok) window.location.assign(result.redirectTo);
          else window.location.reload();
        })
      }
      className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
    >
      {pending ? 'Opening payment…' : 'Continue to payment'}
    </button>
  );
}
