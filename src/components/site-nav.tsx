'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cartStore, CartBadge } from './cart-badge';

type Nav = { count: number; signedIn: boolean; admin: boolean };

const link = 'rounded-md px-2 py-1 text-neutral-700 hover:bg-neutral-100';

/**
 * Session-dependent header state arrives after hydration so that no page in the
 * storefront has to read a cookie during render — that read is what would force
 * every product page to be server-rendered on demand.
 */
export function SiteNav() {
  const [nav, setNav] = useState<Nav | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/nav')
      .then((response) => response.json() as Promise<Nav>)
      .then((data) => {
        if (!alive) return;
        setNav(data);
        cartStore.set(data.count);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="flex items-center gap-1 text-sm">
      {nav?.admin && (
        <Link href="/admin" className={link}>
          Admin
        </Link>
      )}
      <Link href={nav?.signedIn ? '/account' : '/login'} className={link}>
        {nav?.signedIn ? 'Account' : 'Sign in'}
      </Link>
      <CartBadge />
    </div>
  );
}
