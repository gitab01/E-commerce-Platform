import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="container-page flex flex-col gap-8 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm">
          <p className="text-sm font-semibold text-ink">Shega Mart</p>
          <p className="mt-2 text-[0.8125rem] leading-6 text-neutral-600">
            Stock is reserved the moment checkout starts and released automatically if payment does not complete.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-8 gap-y-2 text-sm" aria-label="Storefront">
          <Link href="/products" className="text-neutral-600 hover:text-ink">
            Products
          </Link>
          <Link href="/cart" className="text-neutral-600 hover:text-ink">
            Cart
          </Link>
          <Link href="/account" className="text-neutral-600 hover:text-ink">
            Account
          </Link>
          <Link href="/login" className="text-neutral-600 hover:text-ink">
            Sign in
          </Link>
        </nav>
      </div>
      <div className="border-t border-line">
        <p className="container-page py-4 text-xs text-neutral-500">
          Payment state is set only by signature-verified gateway webhooks.
        </p>
      </div>
    </footer>
  );
}
