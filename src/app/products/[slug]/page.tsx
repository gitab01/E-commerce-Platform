import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { productBySlug } from '@/lib/catalog';
import { formatMoney } from '@/lib/money';
import { AddToCart } from '@/components/add-to-cart';

export const revalidate = 60;

export async function generateStaticParams() {
  const products = await prisma.product.findMany({ where: { active: true }, select: { slug: true } });
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await productBySlug(slug);
  if (!product) return { title: 'Product not found' };
  return { title: product.title, description: product.description.slice(0, 160) };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await productBySlug(slug);
  if (!product || !product.active) notFound();

  const available = product.variants.filter((variant) => variant.stock > 0);
  const lowest = available.length ? Math.min(...available.map((variant) => variant.priceCents)) : null;

  return (
    <div className="container-page py-10 sm:py-12">
      <nav className="text-xs text-neutral-500" aria-label="Breadcrumb">
        <Link href="/products" className="hover:text-ink">
          Products
        </Link>
        <span className="px-2">/</span>
        <Link href={`/products?category=${product.category.slug}`} className="hover:text-ink">
          {product.category.name}
        </Link>
      </nav>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-line bg-neutral-50">
          <Image src={product.image} alt={product.title} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-contain p-10" priority />
        </div>

        <div className="flex flex-col">
          <p className="eyebrow">{product.category.name}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">{product.title}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-2xl font-semibold tabular-nums tracking-tight text-ink">
              {lowest !== null ? formatMoney(lowest) : 'Unavailable'}
            </span>
            {available.length === 0 ? (
              <span className="pill pill-danger">Sold out</span>
            ) : (
              <span className="pill text-neutral-500">
                <span className="dot" aria-hidden="true" />
                {available.length} of {product.variants.length} options in stock
              </span>
            )}
          </div>

          <p className="mt-5 text-sm leading-6 text-neutral-700">{product.description}</p>

          <div className="mt-7 border-t border-line pt-7">
            <AddToCart
              variants={product.variants.map((variant) => ({
                id: variant.id,
                name: variant.name,
                sku: variant.sku,
                priceCents: variant.priceCents,
                stock: variant.stock,
              }))}
            />
          </div>

          <dl className="card mt-7 divide-y divide-line text-sm">
            <div className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
              <dt className="label">SKUs</dt>
              <dd className="font-mono text-xs text-neutral-700">{product.variants.map((variant) => variant.sku).join(', ')}</dd>
            </div>
            <div className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
              <dt className="label">Fulfilment</dt>
              <dd className="text-neutral-900">Dispatch within 2 working days of payment</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
