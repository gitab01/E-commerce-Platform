import Link from 'next/link';
import { publishedProducts } from '@/lib/catalog';
import { ProductCard } from '@/components/product-card';

export const revalidate = 60;

const PROMISES = [
  { title: 'Reserved for 30 minutes', body: 'Starting checkout holds the units. An unfinished payment gives them back.' },
  { title: 'Totals read from the database', body: 'The price you pay is looked up inside the checkout transaction, not sent by the browser.' },
  { title: 'Paid only when the bank agrees', body: 'An order turns paid on a signature-verified gateway webhook, never on a redirect.' },
];

export default async function HomePage() {
  const products = await publishedProducts();
  const featured = products.slice(0, 6);
  const inStock = products.reduce(
    (sum, product) => sum + product.variants.reduce((inner, variant) => inner + variant.stock, 0),
    0,
  );

  return (
    <div className="container-page pt-12 sm:pt-16">
      <section>
        <p className="eyebrow">In stock and ready to ship</p>
        <h1 className="mt-4 max-w-3xl text-[2rem] font-semibold leading-[1.15] tracking-tight text-ink sm:text-5xl">
          Buy it before the last unit goes.
        </h1>
        <p className="mt-4 max-w-2xl text-[0.9375rem] leading-7 text-neutral-600">
          {inStock.toLocaleString()} units are sellable right now across {products.length} products. What the page
          shows is what the shelf holds, and the total is checked against the database before any payment starts.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/products" className="btn btn-primary px-5">
            Browse products
          </Link>
          <Link href="/cart" className="btn btn-secondary">
            View cart
          </Link>
        </div>
      </section>

      <section className="mt-12 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
        {PROMISES.map((promise) => (
          <div key={promise.title} className="bg-white p-5">
            <h2 className="text-sm font-semibold text-ink">{promise.title}</h2>
            <p className="mt-1.5 text-[0.8125rem] leading-6 text-neutral-600">{promise.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-14">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-ink">Latest arrivals</h2>
          <Link href="/products" className="text-sm text-neutral-600 underline-offset-4 hover:text-ink hover:underline">
            All {products.length} products
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        {featured.length === 0 && (
          <p className="mt-6 rounded-lg border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500">
            No catalogue yet. Run <code className="font-mono">npm run db:seed</code> to load the sample products.
          </p>
        )}
      </section>
    </div>
  );
}
