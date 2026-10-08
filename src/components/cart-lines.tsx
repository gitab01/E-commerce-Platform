'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
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
    <ul className="card divide-y divide-line">
      {rows.map((row) => {
        const quantity = quantityOf(row);
        const atLimit = quantity >= row.stock;
        return (
          <li key={row.variantId} className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-line bg-neutral-50">
              <Image
                src={row.image}
                alt={row.title}
                fill
                sizes="56px"
                className="object-contain p-1.5"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{row.title}</p>
              <p className="mt-0.5 text-xs text-neutral-500">
                {row.variantName} · <span className="font-mono">{row.sku}</span>
              </p>
              <p className="mt-0.5 text-xs text-neutral-500 sm:hidden">{formatMoney(row.unitPriceCents * quantity)}</p>
              {atLimit && <p className="mt-1 text-xs text-neutral-700">Maximum available quantity selected.</p>}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => update(row, quantity - 1)}
                className="btn h-8 w-8 border border-neutral-300 px-0 text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50"
                aria-label={`Decrease ${row.title}`}
              >
                −
              </button>
              <span className="w-8 text-center text-sm tabular-nums">{quantity}</span>
              <button
                type="button"
                onClick={() => update(row, quantity + 1)}
                disabled={atLimit}
                className="btn h-8 w-8 border border-neutral-300 px-0 text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50 disabled:opacity-40"
                aria-label={`Increase ${row.title}`}
              >
                +
              </button>
            </div>
            <span className="hidden w-24 shrink-0 text-right text-sm tabular-nums text-ink sm:block">
              {formatMoney(row.unitPriceCents * quantity)}
            </span>
          </li>
        );
      })}
      {pending && <li className="px-4 py-2 text-xs text-neutral-500">Saving…</li>}
      {error && (
        <li role="status" className="px-4 py-2 text-xs text-danger">
          {error}
        </li>
      )}
    </ul>
  );
}
