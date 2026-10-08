'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS: [string, string][] = [
  ['/admin', 'Overview'],
  ['/admin/products', 'Products'],
  ['/admin/orders', 'Orders'],
  ['/admin/inventory', 'Inventory'],
  ['/admin/assets', 'Images'],
  ['/admin/customers', 'Customers'],
];

export function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();

  const tab = (href: string) => {
    const active = href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`);
    return `shrink-0 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
      active ? 'bg-neutral-100 font-medium text-ink' : 'text-neutral-600 hover:bg-neutral-50 hover:text-ink'
    }`;
  };

  return (
    <div className="flex flex-col gap-3 border-b border-line pb-3 sm:flex-row sm:items-center sm:justify-between">
      <nav className="scroll-x -mx-4 flex gap-1 px-4 sm:mx-0 sm:px-0" aria-label="Admin sections">
        {TABS.map(([href, label]) => (
          <Link key={href} href={href} className={tab(href)}>
            {label}
          </Link>
        ))}
      </nav>
      <p className="shrink-0 text-xs text-neutral-500 sm:pl-6">{email}</p>
    </div>
  );
}
