'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveStaff } from '@/app/actions/catalog-admin';

const COPY: Record<string, string> = {
  FORBIDDEN: 'Not permitted.',
  INVALID_INPUT: 'Name, email and a password of at least 8 characters are required.',
  EMAIL_TAKEN: 'That email already shops here — open the account and use Make admin.',
  EMAIL_IS_ADMIN: 'That email is already an admin.',
};

export function StaffForm() {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      ref={form}
      className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1.3fr_1.1fr_auto] sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setMessage(null);
        startTransition(async () => {
          const result = await saveStaff({
            name: String(data.get('name') ?? ''),
            email: String(data.get('email') ?? ''),
            password: String(data.get('password') ?? ''),
          });
          if (result.ok) {
            form.current?.reset();
            router.refresh();
            setMessage('Admin added. They can sign in at /login with that password.');
          } else {
            setMessage(COPY[result.reason] ?? 'Failed.');
          }
        });
      }}
    >
      <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
        <span className="text-xs text-neutral-500">Name</span>
        <input name="name" required minLength={2} maxLength={120} placeholder="Store manager" className={field} />
      </label>
      <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
        <span className="text-xs text-neutral-500">Email</span>
        <input
          name="email"
          type="email"
          required
          maxLength={200}
          autoComplete="off"
          placeholder="manager@example.com"
          className={field}
        />
      </label>
      <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
        <span className="text-xs text-neutral-500">Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          maxLength={200}
          autoComplete="new-password"
          placeholder="at least 8 characters"
          className={field}
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="h-[34px] rounded-md bg-neutral-900 px-3 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? 'Adding…' : 'Add admin'}
      </button>
      {message && (
        <p role="status" className="col-span-2 text-xs text-neutral-600 sm:col-span-4">
          {message}
        </p>
      )}
    </form>
  );
}

const field =
  'w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none';
