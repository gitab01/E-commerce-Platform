'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { adjustStock } from '@/app/actions/account';

const COPY: Record<string, string> = {
  WOULD_GO_NEGATIVE: 'Refused: that would take the count below zero.',
  FORBIDDEN: 'Not permitted.',
  INVALID_INPUT: 'Enter a whole number.',
};

export function StockAdjust({ variantId, sku, stock }: { variantId: string; sku: string; stock: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ text: string; ok: boolean } | null>(null);

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const delta = Number.parseInt(String(form.get('delta') ?? ''), 10);
        setResult(null);
        startTransition(async () => {
          const response = await adjustStock(variantId, delta, String(form.get('reason') ?? ''));
          router.refresh();
          form.set('delta', '');
          setResult({
            text: response.ok ? `Recorded for ${sku}.` : COPY[response.reason] ?? 'Failed.',
            ok: response.ok,
          });
        });
      }}
    >
      <input
        name="delta"
        inputMode="numeric"
        placeholder={stock === 0 ? 'restock +' : '+ / −'}
        className="w-24 rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm tabular-nums placeholder:text-neutral-400"
        required
      />
      <input
        name="reason"
        placeholder="reason"
        className="w-28 rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm placeholder:text-neutral-400"
      />
      <button type="submit" disabled={pending} className="btn btn-secondary py-1">
        {pending ? 'Saving…' : 'Apply'}
      </button>
      {result && (
        <p role="status" className={`w-full text-xs sm:w-auto ${result.ok ? 'text-neutral-600' : 'text-danger'}`}>
          {result.text}
        </p>
      )}
    </form>
  );
}
