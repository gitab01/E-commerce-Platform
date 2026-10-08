'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { reorderFromOrder } from '@/app/actions/cart';

export function ReorderButton({ reference }: { reference: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await reorderFromOrder(reference);
          // The refreshed header re-seeds the badge with the authoritative count.
          router.refresh();
          if (result.added > 0) router.push('/cart');
        })
      }
      className="btn btn-secondary btn-sm"
    >
      {pending ? 'Adding…' : 'Buy again'}
    </button>
  );
}
