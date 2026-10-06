import Link from 'next/link';
import { SiteNav } from './site-nav';
import { BrandMark } from './brand-mark';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white">
      <div className="container-page flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 sm:h-14 sm:py-0">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="Shega Mart home">
            <BrandMark />
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/products" className="rounded-md px-2 py-1 text-neutral-700 hover:bg-neutral-100">
              Products
            </Link>
          </nav>
        </div>
        <SiteNav />
      </div>
    </header>
  );
}
