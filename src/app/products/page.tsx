import Link from 'next/link';
import { publishedProducts, categories } from '@/lib/catalog';
import { ProductCard } from '@/components/product-card';

export const revalidate = 60;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const all = await categories();
  const target = category ? all.find((entry) => entry.slug === category) : undefined;
  const products = await publishedProducts(target ? { categoryId: target.id } : {});

  return (
    <div className="container-page py-10 sm:py-12">
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {target ? target.name : 'All products'}
          </h1>
          <p className="mt-1.5 text-sm text-neutral-600">
            {products.length} {products.length === 1 ? 'product' : 'products'} listed.
          </p>
        </div>
        <nav className="scroll-x -mx-4 flex gap-2 px-4 pb-1 text-sm sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0" aria-label="Categories">
          <Link
            href="/products"
            className={`shrink-0 rounded-full border px-3 py-1 transition-colors ${!target ? 'border-ink bg-ink text-white' : 'border-neutral-300 text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50'}`}
          >
            All
          </Link>
          {all.map((entry) => (
            <Link
              key={entry.id}
              href={`/products?category=${entry.slug}`}
              className={`shrink-0 rounded-full border px-3 py-1 transition-colors ${
                target?.slug === entry.slug
                  ? 'border-ink bg-ink text-white'
                  : 'border-neutral-300 text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50'
              }`}
            >
              {entry.name}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
