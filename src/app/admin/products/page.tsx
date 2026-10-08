import Link from 'next/link';
import { prisma } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import { totalStock } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage(props: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q = '', status = 'all' } = await props.searchParams;
  const term = q.trim();

  const products = await prisma.product.findMany({
    where: {
      ...(status === 'listed' ? { active: true } : status === 'hidden' ? { active: false } : {}),
      ...(term
        ? {
            OR: [
              { title: { contains: term, mode: 'insensitive' } },
              { slug: { contains: term, mode: 'insensitive' } },
              { category: { name: { contains: term, mode: 'insensitive' } } },
              { variants: { some: { sku: { contains: term.toUpperCase(), mode: 'insensitive' } } } },
            ],
          }
        : {}),
    },
    include: {
      category: { select: { name: true } },
      variants: { select: { id: true, sku: true, priceCents: true, stock: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const sales = await prisma.orderItem.groupBy({
    by: ['variantId'],
    _count: { _all: true },
    where: { variantId: { in: products.flatMap((product) => product.variants.map((variant) => variant.id)) } },
  });
  const soldByVariant = new Map(sales.map((row) => [row.variantId, row._count._all]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {products.length} of the catalogue shown. Deleting is refused for anything with order history — hide it
            instead.
          </p>
        </div>
        <Link href="/admin/products/new" className="btn btn-primary">
          New product
        </Link>
      </div>

      <form
        className="scroll-x -mx-4 flex flex-nowrap items-center gap-2 px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
        action="/admin/products"
      >
        <input
          name="q"
          defaultValue={term}
          placeholder="Search title, handle, SKU or category"
          className="w-full max-w-xs shrink-0 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm placeholder:text-neutral-400"
        />
        <select
          name="status"
          defaultValue={status}
          className="shrink-0 rounded-md border border-neutral-300 bg-white px-2 py-2 text-sm"
        >
          <option value="all">All</option>
          <option value="listed">Listed</option>
          <option value="hidden">Hidden</option>
        </select>
        <button type="submit" className="btn btn-secondary shrink-0">
          Filter
        </button>
        {(term || status !== 'all') && (
          <Link href="/admin/products" className="shrink-0 text-xs text-neutral-500 underline-offset-4 hover:underline">
            Reset
          </Link>
        )}
      </form>

      <ul className="card divide-y divide-line">
        <li className="hidden grid-cols-[1fr_auto_auto_auto] gap-x-4 px-5 py-2.5 sm:grid">
          <span className="eyebrow">Product</span>
          <span className="eyebrow w-28 text-right">Stock</span>
          <span className="eyebrow w-20 text-right">Sold</span>
          <span className="eyebrow w-20 text-right">State</span>
        </li>
        {products.map((product) => {
          const sold = product.variants.reduce((sum, variant) => sum + (soldByVariant.get(variant.id) ?? 0), 0);
          const prices = product.variants.map((variant) => variant.priceCents);
          const stock = totalStock(product.variants);
          return (
            <li
              key={product.id}
              className="grid grid-cols-3 items-center gap-x-3 gap-y-1 px-5 py-3.5 sm:grid-cols-[1fr_auto_auto_auto]"
            >
              <div className="col-span-3 min-w-0 sm:col-span-1">
                <Link
                  href={`/admin/products/${product.id}`}
                  className="block truncate text-sm font-medium underline-offset-4 hover:underline"
                >
                  {product.title}
                </Link>
                <p className="truncate text-xs text-neutral-500">
                  <span className="font-mono">{product.slug}</span> · {product.category.name} ·{' '}
                  {product.variants.length} variant{product.variants.length === 1 ? '' : 's'}
                  {prices.length > 0 && (
                    <>
                      {' '}
                      · {formatMoney(Math.min(...prices))}
                      {Math.max(...prices) !== Math.min(...prices) && `–${formatMoney(Math.max(...prices))}`}
                    </>
                  )}
                </p>
              </div>
              <div className="flex justify-end sm:w-28">
                <span className={`pill tabular-nums ${stock === 0 ? 'pill-danger' : 'pill-neutral'}`}>
                  {stock} in stock
                </span>
              </div>
              <span className="justify-self-end text-sm tabular-nums text-neutral-600 sm:w-20 sm:text-right">
                {sold} sold
              </span>
              <div className="flex justify-end sm:w-20">
                <span className={`pill ${product.active ? 'pill-dark' : 'pill-outline'}`}>
                  {product.active ? 'listed' : 'hidden'}
                </span>
              </div>
            </li>
          );
        })}
        {products.length === 0 && (
          <li className="px-5 py-8 text-sm text-neutral-500">
            No products match this search.{' '}
            <Link href="/admin/products/new" className="underline underline-offset-4">
              Add one
            </Link>
            .
          </li>
        )}
      </ul>
    </div>
  );
}
