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
        className="btn btn-primary py-2.5"
      >
        {pending ? 'Confirming…' : 'Pay now'}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => confirmDemoPayment(reference, 'failed'))}
        className="btn btn-secondary py-2.5"
      >
        Simulate failure
      </button>
    </div>
  );
}
