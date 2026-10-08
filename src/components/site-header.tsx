import Link from 'next/link';
import { SiteNav } from './site-nav';
import { BrandMark } from './brand-mark';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white">
      <div className="container-page flex h-14 items-center justify-between gap-3">
        <Link href="/" aria-label="Shega Mart home" className="flex shrink-0 items-center">
          <BrandMark />
        </Link>
        <SiteNav />
      </div>
    </header>
  );
}
