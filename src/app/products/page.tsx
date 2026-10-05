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
    <div className="container-page py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{target ? target.name : 'All products'}</h1>
          <p className="mt-1 text-sm text-neutral-600">{products.length} products listed.</p>
        </div>
        <nav className="flex flex-wrap gap-2 text-sm" aria-label="Categories">
          <Link
            href="/products"
            className={`rounded-full border px-3 py-1 ${!target ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100'}`}
          >
            All
          </Link>
          {all.map((entry) => (
            <Link
              key={entry.id}
              href={`/products?category=${entry.slug}`}
              className={`rounded-full border px-3 py-1 ${
                target?.slug === entry.slug
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100'
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
