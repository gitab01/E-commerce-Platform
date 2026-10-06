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
        <Link
          href="/admin/products/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          New product
        </Link>
      </div>

      <form className="flex flex-wrap items-center gap-2" action="/admin/products">
        <input
          name="q"
          defaultValue={term}
          placeholder="Search title, handle, SKU or category"
          className="w-full max-w-xs rounded-md border border-neutral-300 px-3 py-2 text-sm placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
        />
        <select name="status" defaultValue={status} className="rounded-md border border-neutral-300 px-2 py-2 text-sm">
          <option value="all">All</option>
          <option value="listed">Listed</option>
          <option value="hidden">Hidden</option>
        </select>
        <button type="submit" className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100">
          Filter
        </button>
        {(term || status !== 'all') && (
          <Link href="/admin/products" className="text-xs text-neutral-500 underline-offset-4 hover:underline">
            Reset
          </Link>
        )}
      </form>

      <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
        {products.map((product) => {
          const sold = product.variants.reduce((sum, variant) => sum + (soldByVariant.get(variant.id) ?? 0), 0);
          const prices = product.variants.map((variant) => variant.priceCents);
          const stock = totalStock(product.variants);
          return (
            <li key={product.id} className="grid grid-cols-2 gap-x-4 gap-y-1 py-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
              <div className="col-span-2 min-w-0 sm:col-span-1">
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
              <span className={`text-sm tabular-nums ${stock === 0 ? 'font-semibold text-neutral-900' : 'text-neutral-600'}`}>
                {stock} in stock
              </span>
              <span className="text-xs tabular-nums text-neutral-500">{sold} sold</span>
              <span
                className={`w-fit rounded-full px-2 py-0.5 text-xs ${
                  product.active ? 'bg-neutral-100 text-neutral-700' : 'bg-neutral-200 text-neutral-600'
                }`}
              >
                {product.active ? 'listed' : 'hidden'}
              </span>
            </li>
          );
        })}
        {products.length === 0 && (
          <li className="py-6 text-sm text-neutral-500">
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
