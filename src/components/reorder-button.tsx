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
      className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs text-neutral-800 hover:bg-neutral-100 disabled:opacity-50"
    >
      {pending ? 'Adding…' : 'Buy again'}
    </button>
  );
}
