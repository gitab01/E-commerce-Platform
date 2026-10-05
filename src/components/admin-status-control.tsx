'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setOrderStatus } from '@/app/actions/account';
import type { OrderStatus } from '@prisma/client';

/**
 * Only legal transitions are offered, and the service re-checks them — an
 * illegal one is recorded in the audit trail rather than silently ignored.
 */
export function AdminStatusControl({
  orderId,
  reference,
  current,
  options,
}: {
  orderId: string;
  reference: string;
  current: OrderStatus;
  options: { value: OrderStatus; label: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (options.length === 0) {
    return <span className="text-xs text-neutral-500">No further transitions</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <select
          aria-label={`Change status of ${reference}`}
          defaultValue=""
          disabled={pending}
          onChange={(event) => {
            const next = event.target.value as OrderStatus | '';
            if (!next) return;
            setError(null);
            startTransition(async () => {
              const result = await setOrderStatus(orderId, next);
              router.refresh();
              if (!result.ok) setError(result.reason === 'FORBIDDEN' ? 'Not permitted.' : 'That transition was rejected.');
              event.target.value = '';
            });
          }}
          className="rounded-md border border-neutral-300 px-2 py-1 text-sm disabled:opacity-50"
        >
          <option value="">Move to…</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {pending && <span className="text-xs text-neutral-500">Saving…</span>}
      </div>
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      {current === 'PENDING' && <span className="text-xs text-neutral-500">awaiting webhook</span>}
    </div>
  );
}
