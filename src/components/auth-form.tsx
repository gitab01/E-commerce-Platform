'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginWithPassword, registerWithPassword } from '@/app/actions/account';

const REASON_COPY: Record<string, string> = {
  BAD_CREDENTIALS: 'That email and password do not match.',
  EMAIL_TAKEN: 'An account already exists for that email — sign in instead.',
  INVALID_INPUT: 'Use a valid email and a password of at least 8 characters.',
};

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') ?? '/account';
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError(null);
        startTransition(async () => {
          const payload = {
            email: String(form.get('email') ?? ''),
            password: String(form.get('password') ?? ''),
            name: String(form.get('name') ?? '') || undefined,
          };
          const result = mode === 'login' ? await loginWithPassword(payload) : await registerWithPassword(payload);
          if (result.ok) {
            router.refresh();
            router.push(next);
            return;
          }
          setError(REASON_COPY[result.reason] ?? 'Something went wrong.');
        });
      }}
    >
      {mode === 'register' && (
        <label className="text-xs text-neutral-600">
          Name
          <input
            name="name"
            required
            minLength={2}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
      )}
      <label className="text-xs text-neutral-600">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-xs text-neutral-600">
        Password
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </label>
      {error && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
      >
        {pending ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
      </button>
    </form>
  );
}
