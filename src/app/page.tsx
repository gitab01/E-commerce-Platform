import Link from 'next/link';
import { publishedProducts } from '@/lib/catalog';
import { ProductCard } from '@/components/product-card';
import { formatMoney } from '@/lib/money';

export const revalidate = 60;

export default async function HomePage() {
  const products = await publishedProducts();
  const featured = products.slice(0, 6);
  const inStock = products.reduce(
    (sum, product) => sum + product.variants.reduce((inner, variant) => inner + variant.stock, 0),
    0,
  );

  return (
    <div className="container-page py-10 sm:py-14">
      <section className="border-b border-neutral-200 pb-10">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Inventory available now</p>
        <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
          Buy it before the last unit goes — checkout reserves stock the moment you commit.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-600">
          Prices are re-read from the database inside the checkout transaction, and an order only becomes paid when a
          signature-verified gateway webhook says so. {inStock.toLocaleString()} units are sellable right now.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/products"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Browse products
          </Link>
          <Link
            href="/cart"
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100"
          >
            View cart
          </Link>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Latest arrivals</h2>
          <Link href="/products" className="text-sm text-neutral-600 underline-offset-4 hover:underline">
            All {products.length} products
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        {featured.length === 0 && (
          <p className="mt-6 rounded-md border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
            No catalogue yet. Run <code className="font-mono">npm run db:seed</code> to load the sample products.
          </p>
        )}
      </section>

      {featured[0] && (
        <p className="mt-8 text-xs text-neutral-500">
          Lowest price in the catalogue: {formatMoney(Math.min(...featured.flatMap((p) => p.variants.map((v) => v.priceCents))))}
        </p>
      )}
    </div>
  );
}
