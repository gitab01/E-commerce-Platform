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
      className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium text-neutral-900 hover:bg-neutral-100"
      aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
    >
      <span className="hidden sm:inline">Cart</span>
      <span
        className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold tabular-nums ${
          count > 0 ? 'bg-neutral-900 text-white' : 'bg-neutral-200 text-neutral-600'
        }`}
      >
        {count}
      </span>
    </a>
  );
}
