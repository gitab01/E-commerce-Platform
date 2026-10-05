'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addToCart } from '@/app/actions/cart';
import { cartStore } from './cart-badge';
import { formatMoney } from '@/lib/money';

export type VariantOption = {
  id: string;
  name: string;
  sku: string;
  priceCents: number;
  stock: number;
};

export function AddToCart({ variants }: { variants: VariantOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const selectable = useMemo(() => variants.filter((variant) => variant.stock > 0), [variants]);
  const [variantId, setVariantId] = useState(selectable[0]?.id ?? variants[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<string | null>(null);

  const selected = variants.find((variant) => variant.id === variantId);
  const max = selected?.stock ?? 0;
  const soldOut = selectable.length === 0;

  function pick(id: string) {
    setVariantId(id);
    setMessage(null);
    const stock = variants.find((variant) => variant.id === id)?.stock ?? 1;
    setQuantity((current) => Math.min(Math.max(1, current), Math.max(1, stock)));
  }

  function submit() {
    if (!selected) return;
    setMessage(null);
    startTransition(async () => {
      const result = await addToCart(selected.id, quantity);
      if (result.ok) {
        cartStore.set(result.count);
        router.refresh();
        setMessage(`Added ${quantity} × ${selected.name} to your cart.`);
        return;
      }
      if (result.reason === 'INSUFFICIENT_STOCK') {
        // Someone moved the stock while this page was open: show what is real.
        setQuantity(Math.max(1, result.available));
        setMessage(result.available === 0 ? 'This option just sold out.' : `Only ${result.available} left.`);
        router.refresh();
        return;
      }
      setMessage('Could not add that to your cart.');
    });
  }

  if (soldOut) {
    return (
      <div className="rounded-md border border-neutral-300 bg-neutral-50 p-4">
        <p className="text-sm font-medium text-neutral-900">Sold out</p>
        <p className="mt-1 text-sm text-neutral-600">
          Every option of this product is reserved or gone. Check back after the payment window closes on pending
          orders.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <fieldset>
        <legend className="text-xs font-medium uppercase tracking-wide text-neutral-500">Option</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {variants.map((variant) => (
            <button
              key={variant.id}
              type="button"
              onClick={() => pick(variant.id)}
              disabled={variant.stock === 0}
              aria-pressed={variant.id === variantId}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                variant.stock === 0
                  ? 'cursor-not-allowed border-neutral-200 text-neutral-300 line-through'
                  : variant.id === variantId
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-300 text-neutral-800 hover:border-neutral-500'
              }`}
            >
              {variant.name}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="qty" className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Quantity
          </label>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="h-9 w-9 rounded-md border border-neutral-300 text-neutral-800 hover:bg-neutral-100"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <input
              id="qty"
              type="number"
              inputMode="numeric"
              min={1}
              max={max}
              value={quantity}
              onChange={(event) =>
                setQuantity(Math.min(max, Math.max(1, Number.parseInt(event.target.value, 10) || 1)))
              }
              className="h-9 w-16 rounded-md border border-neutral-300 text-center text-sm tabular-nums"
            />
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(max, q + 1))}
              className="h-9 w-9 rounded-md border border-neutral-300 text-neutral-800 hover:bg-neutral-100"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !selected || quantity > max}
          className="h-9 flex-1 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 sm:flex-none"
        >
          {pending ? 'Adding…' : `Add to cart · ${selected ? formatMoney(selected.priceCents * quantity) : ''}`}
        </button>
      </div>

      {selected && selected.stock <= 3 && (
        <p className="text-xs text-neutral-600">Only {selected.stock} left in this option.</p>
      )}
      {message && (
        <p role="status" className="text-sm text-neutral-800">
          {message}
        </p>
      )}
    </div>
  );
}
