'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setCustomerRole } from '@/app/actions/catalog-admin';
import type { Role } from '@prisma/client';

const COPY: Record<string, string> = {
  FORBIDDEN: 'Not permitted.',
  SELF_CHANGE: "You cannot change your own role — that would let the last admin lock the dashboard.",
  LAST_ADMIN: 'At least one admin must remain.',
  UNCHANGED: 'Already set to that role.',
  NOT_FOUND: 'That account no longer exists.',
};

const LABELS: Record<Role, string> = { CUSTOMER: 'Customer', ADMIN: 'Admin' };

export function RoleControl({ userId, current }: { userId: string; current: Role }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const target: Role = current === 'ADMIN' ? 'CUSTOMER' : 'ADMIN';

  return (
    <span className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const result = await setCustomerRole(userId, target);
            setMessage(result.ok ? null : COPY[result.reason] ?? 'Failed.');
            if (result.ok) router.refresh();
          });
        }}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 hover:bg-neutral-100 disabled:opacity-50"
      >
        {pending ? 'Saving…' : `Make ${LABELS[target].toLowerCase()}`}
      </button>
      {message && (
        <span role="alert" className="text-xs text-red-700">
          {message}
        </span>
      )}
    </span>
  );
}
