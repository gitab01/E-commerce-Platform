import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import { ProductForm } from '@/components/product-form';
import { VariantForm } from '@/components/variant-form';
import { DeleteControl } from '@/components/delete-control';

export const dynamic = 'force-dynamic';

export default async function EditProductPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: { select: { name: true } },
      variants: { orderBy: [{ priceCents: 'asc' }, { sku: 'asc' }] },
    },
  });
  if (!product) notFound();

  const sales = await prisma.orderItem.groupBy({
    by: ['variantId'],
    _count: { _all: true },
    where: { variantId: { in: product.variants.map((variant) => variant.id) } },
  });
  const soldByVariant = new Map(sales.map((row) => [row.variantId, row._count._all]));
  const soldLines = [...soldByVariant.values()].reduce((sum, count) => sum + count, 0);

  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' }, select: { name: true } });

  return (
    <div className="flex flex-col gap-10">
      <div>
        <Link href="/admin/products" className="text-xs text-neutral-500 underline-offset-4 hover:underline">
          ← Products
        </Link>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{product.title}</h1>
          <span className="text-xs text-neutral-500">
            updated {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(product.updatedAt)}
          </span>
        </div>
        <p className="mt-1 text-sm text-neutral-600">
          <Link href={`/products/${product.slug}`} className="underline underline-offset-4">
            /products/{product.slug}
          </Link>{' '}
          · {product.variants.length} variant{product.variants.length === 1 ? '' : 's'} · {soldLines} order line
          {soldLines === 1 ? '' : 's'} reference this product
        </p>
      </div>

      <section className="card max-w-2xl p-5">
        <h2 className="eyebrow">Details</h2>
        <div className="mt-4">
          <ProductForm
            draft={{
              id: product.id,
              title: product.title,
              handle: product.slug,
              description: product.description,
              image: product.image,
              category: product.category.name,
              active: product.active,
            }}
            categories={categories.map((category) => category.name)}
          />
        </div>
      </section>

      <section>
        <h2 className="eyebrow">Variants</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Prices are typed in whole Birr and stored as integer cents. Stock set here replaces the count; a negative
          number is refused by the database.
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {product.variants.map((variant) => (
            <li key={variant.id} className="card flex flex-col gap-3 p-5">
              <VariantForm
                productId={product.id}
                variant={{
                  id: variant.id,
                  sku: variant.sku,
                  name: variant.name,
                  priceCents: variant.priceCents,
                  stock: variant.stock,
                }}
              />
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                <span className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                  <span className="tabular-nums">{formatMoney(variant.priceCents)}</span>
                  <span className={`pill ${variant.stock === 0 ? 'pill-danger' : 'pill-neutral'}`}>
                    {variant.stock} in stock
                  </span>
                  <span className="tabular-nums">{soldByVariant.get(variant.id) ?? 0} sold</span>
                </span>
                <DeleteControl kind="variant" id={variant.id} label="Delete variant" />
              </div>
            </li>
          ))}
          {product.variants.length === 0 && (
            <li className="card px-5 py-6 text-sm text-neutral-500">No variants yet — add one below.</li>
          )}
        </ul>
        <div className="card mt-4 p-5">
          <h3 className="eyebrow">Add a variant</h3>
          <div className="mt-3">
            <VariantForm productId={product.id} />
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-semibold">Delete this product</h2>
        <p className="mt-1 max-w-xl text-sm text-neutral-600">
          {soldLines > 0
            ? 'This product is referenced by order history, so its records stay. Hiding it removes it from the catalogue without breaking past orders.'
            : 'No orders reference this product, so it can be removed along with its variants.'}
        </p>
        <div className="mt-3">
          <DeleteControl
            kind="product"
            id={product.id}
            label="Delete product"
            redirectTo="/admin/products"
          />
        </div>
      </section>
    </div>
  );
}
