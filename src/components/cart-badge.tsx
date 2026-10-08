'use client';

import { useSyncExternalStore } from 'react';

type Listener = () => void;

const state = { count: 0 };
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

export const cartStore = {
  set(count: number) {
    if (state.count !== count) {
      state.count = count;
      emit();
    }
  },
  bump(delta: number) {
    state.count = Math.max(0, state.count + delta);
    emit();
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get count() {
    return state.count;
  },
};

export function CartBadge() {
  // The count comes from /api/nav on mount and from each cart action after that,
  // so the header never has to read a session cookie during render.
  const count = useSyncExternalStore(cartStore.subscribe, () => cartStore.count, () => 0);

  return (
    <a
      href="/cart"
      className="ml-0.5 inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-ink hover:bg-neutral-100"
      aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[18px] w-[18px]" aria-hidden="true">
        <path d="M6 8h12l-1 11a1.5 1.5 0 0 1-1.5 1.4h-9A1.5 1.5 0 0 1 5 19L6 8Z" strokeLinejoin="round" />
        <path d="M9.2 8V6.6a2.8 2.8 0 0 1 5.6 0V8" strokeLinecap="round" />
      </svg>
      <span className="hidden md:inline">Cart</span>
      <span
        className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold tabular-nums ${
          count > 0 ? 'bg-ink text-white' : 'bg-neutral-200 text-neutral-600'
        }`}
      >
        {count}
      </span>
    </a>
  );
}
