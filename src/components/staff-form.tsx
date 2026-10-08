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
        <span className="label">Name</span>
        <input name="name" required minLength={2} maxLength={120} placeholder="Store manager" className="field" />
      </label>
      <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
        <span className="label">Email</span>
        <input
          name="email"
          type="email"
          required
          maxLength={200}
          autoComplete="off"
          placeholder="manager@example.com"
          className="field"
        />
      </label>
      <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
        <span className="label">Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          maxLength={200}
          autoComplete="new-password"
          placeholder="at least 8 characters"
          className="field"
        />
      </label>
      <button type="submit" disabled={pending} className="btn btn-primary">
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
