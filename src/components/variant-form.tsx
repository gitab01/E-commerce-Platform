'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveVariant } from '@/app/actions/catalog-admin';

const COPY: Record<string, string> = {
  FORBIDDEN: 'Not permitted.',
  INVALID_INPUT: 'SKU, option name, price and stock are all required.',
  INVALID_ID: 'That variant belongs to a different product, or no longer exists.',
  NOT_FOUND: 'That product no longer exists.',
  SKU_TAKEN: 'Another variant already uses that SKU.',
  BAD_PRICE: 'Price must be a positive amount with at most two decimals.',
};

export type VariantDraft = { id?: string; sku: string; name: string; priceCents: number; stock: number };

export function VariantForm({ productId, variant }: { productId: string; variant?: VariantDraft }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const isEdit = Boolean(variant?.id);

  return (
    <form
      className="grid grid-cols-2 gap-2 sm:grid-cols-[7rem_1fr_6.5rem_5rem_auto] sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const input = {
          sku: String(form.get('sku') ?? ''),
          name: String(form.get('name') ?? ''),
          price: String(form.get('price') ?? ''),
          stock: String(form.get('stock') ?? ''),
        };
        setMessage(null);
        startTransition(async () => {
          const result = await saveVariant(productId, input, variant?.id ?? '');
          router.refresh();
          setMessage(result.ok ? 'Saved.' : COPY[result.reason] ?? 'Failed.');
        });
      }}
    >
      <label className="col-span-1 flex flex-col gap-1">
        <span className="text-xs text-neutral-500">SKU</span>
        <input
          name="sku"
          defaultValue={variant?.sku ?? ''}
          required
          minLength={2}
          maxLength={40}
          placeholder="HPH-BLK-M"
          className={`${field} font-mono uppercase`}
        />
      </label>
      <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
        <span className="text-xs text-neutral-500">Option name</span>
        <input
          name="name"
          defaultValue={variant?.name ?? ''}
          required
          maxLength={60}
          placeholder="Black / Medium"
          className={field}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-neutral-500">Price (Birr)</span>
        <input
          name="price"
          inputMode="decimal"
          defaultValue={variant ? (variant.priceCents / 100).toFixed(2) : ''}
          required
          maxLength={16}
          placeholder="1200"
          className={`${field} tabular-nums`}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-neutral-500">Stock</span>
        <input
          name="stock"
          inputMode="numeric"
          defaultValue={variant ? String(variant.stock) : ''}
          required
          maxLength={7}
          placeholder="12"
          className={`${field} tabular-nums`}
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="h-[34px] rounded-md border border-neutral-300 px-3 text-sm text-neutral-900 hover:bg-neutral-100 disabled:opacity-50"
      >
        {pending ? 'Saving…' : isEdit ? 'Save' : 'Add variant'}
      </button>
      {message && (
        <p role="status" className="col-span-2 text-xs text-neutral-600 sm:col-span-5">
          {message}
        </p>
      )}
    </form>
  );
}

const field =
  'w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none';
