'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { clearCart } from '@/app/actions/cart';
import { cartStore } from './cart-badge';

export function ClearCartButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await clearCart();
          cartStore.set(0);
          router.refresh();
        })
      }
      className="text-sm text-neutral-600 underline-offset-4 hover:text-neutral-900 hover:underline disabled:opacity-50"
    >
      {pending ? 'Emptying…' : 'Empty cart'}
    </button>
  );
}
