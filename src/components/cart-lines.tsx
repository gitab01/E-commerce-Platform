'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setCartItemQuantity } from '@/app/actions/cart';
import { cartStore } from './cart-badge';
import { formatMoney } from '@/lib/money';

export type CartRow = {
  variantId: string;
  sku: string;
  title: string;
  variantName: string;
  image: string;
  quantity: number;
  unitPriceCents: number;
  stock: number;
};

export function CartLines({ rows }: { rows: CartRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [local, setLocal] = useState<Record<string, number>>({});

  function quantityOf(row: CartRow) {
    return local[row.variantId] ?? row.quantity;
  }

  function update(row: CartRow, next: number) {
    const clamped = Math.max(0, Math.min(row.stock, next));
    setError(null);
    setLocal((current) => ({ ...current, [row.variantId]: clamped }));
    startTransition(async () => {
      const result = await setCartItemQuantity(row.variantId, clamped);
      if (result.ok) {
        cartStore.set(result.count);
        router.refresh();
        return;
      }
      if (result.reason === 'INSUFFICIENT_STOCK') {
        setLocal((current) => ({ ...current, [row.variantId]: result.available }));
        setError(`${row.title} — only ${result.available} available.`);
        router.refresh();
        return;
      }
      setError('That change did not save.');
    });
  }

  if (rows.length === 0) return null;

  return (
    <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
      {rows.map((row) => {
        const quantity = quantityOf(row);
        const atLimit = quantity >= row.stock;
        return (
          <li key={row.variantId} className="flex items-center gap-4 py-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-neutral-950">{row.title}</p>
              <p className="text-xs text-neutral-500">
                {row.variantName} · <span className="font-mono">{row.sku}</span>
              </p>
              {atLimit && <p className="mt-1 text-xs text-neutral-700">Maximum available quantity selected.</p>}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => update(row, quantity - 1)}
                className="h-8 w-8 rounded-md border border-neutral-300 text-neutral-800 hover:bg-neutral-100"
                aria-label={`Decrease ${row.title}`}
              >
                −
              </button>
              <span className="w-8 text-center text-sm tabular-nums">{quantity}</span>
              <button
                type="button"
                onClick={() => update(row, quantity + 1)}
                disabled={atLimit}
                className="h-8 w-8 rounded-md border border-neutral-300 text-neutral-800 hover:bg-neutral-100 disabled:opacity-40"
                aria-label={`Increase ${row.title}`}
              >
                +
              </button>
            </div>
            <span className="w-24 text-right text-sm tabular-nums text-neutral-900">
              {formatMoney(row.unitPriceCents * quantity)}
            </span>
          </li>
        );
      })}
      {pending && <li className="py-2 text-xs text-neutral-500">Saving…</li>}
      {error && (
        <li role="status" className="py-2 text-xs text-red-700">
          {error}
        </li>
      )}
    </ul>
  );
}
