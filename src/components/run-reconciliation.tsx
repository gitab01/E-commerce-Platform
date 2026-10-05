'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { runReconciliationNow } from '@/app/actions/account';

export function RunReconciliation() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [summary, setSummary] = useState<string | null>(null);

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await runReconciliationNow();
            setSummary(result.ok ? result.summary : 'Not permitted.');
            router.refresh();
          })
        }
        className="rounded-md border border-neutral-300 px-3.5 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100 disabled:opacity-60"
      >
        {pending ? 'Running…' : 'Run reconciliation now'}
      </button>
      {summary && <p role="status" className="text-xs text-neutral-600">{summary}</p>}
    </div>
  );
}
