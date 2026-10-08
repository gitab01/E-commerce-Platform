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
      className="btn btn-primary py-2.5"
    >
      {pending ? 'Opening payment…' : 'Continue to payment'}
    </button>
  );
}
