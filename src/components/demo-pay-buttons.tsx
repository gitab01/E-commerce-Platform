'use client';

import { useTransition } from 'react';
import { confirmDemoPayment } from '@/app/actions/demo-pay';

export function DemoPayButtons({ reference }: { reference: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => confirmDemoPayment(reference, 'paid'))}
        className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
      >
        {pending ? 'Confirming…' : 'Pay now'}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => confirmDemoPayment(reference, 'failed'))}
        className="rounded-md border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-900 hover:bg-neutral-100 disabled:opacity-60"
      >
        Simulate failure
      </button>
    </div>
  );
}
