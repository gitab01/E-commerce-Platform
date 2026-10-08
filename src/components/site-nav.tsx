'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cartStore, CartBadge } from './cart-badge';

type Nav = { count: number; signedIn: boolean; admin: boolean };

/**
 * Session-dependent header state arrives after hydration so that no page in the
 * storefront has to read a cookie during render — that read is what would force
 * every product page to be server-rendered on demand.
 */
export function SiteNav() {
  const pathname = usePathname();
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

  const tab = (href: string) =>
    `rounded-md px-2.5 py-1.5 text-sm transition-colors ${
      pathname === href || (href !== '/' && pathname.startsWith(`${href}/`))
        ? 'bg-neutral-100 font-medium text-ink'
        : 'text-neutral-600 hover:bg-neutral-50 hover:text-ink'
    }`;

  const accountHref = nav?.signedIn ? '/account' : '/login';

  return (
    <nav className="flex min-w-0 items-center gap-0.5">
      <Link href="/products" className={tab('/products')}>
        Products
      </Link>
      {nav?.admin && (
        <Link href="/admin" className={tab('/admin')}>
          Admin
        </Link>
      )}
      <Link href={accountHref} className={tab(accountHref)}>
        {nav?.signedIn ? 'Account' : 'Sign in'}
      </Link>
      <CartBadge />
    </nav>
  );
}
