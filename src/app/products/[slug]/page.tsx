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
    <div className="container-page py-10">
      <nav className="text-xs text-neutral-500">
        <Link href="/products" className="hover:text-neutral-900">
          Products
        </Link>
        <span className="px-2">/</span>
        <Link href={`/products?category=${product.category.slug}`} className="hover:text-neutral-900">
          {product.category.name}
        </Link>
      </nav>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
          <Image src={product.image} alt={product.title} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-contain p-10" priority />
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{product.title}</h1>
            <p className="mt-2 text-sm text-neutral-600">
              {lowest !== null ? `From ${formatMoney(lowest)}` : 'Currently unavailable'} ·{' '}
              {available.length} of {product.variants.length} options in stock
            </p>
          </div>

          <p className="text-sm leading-6 text-neutral-700">{product.description}</p>

          <AddToCart
            variants={product.variants.map((variant) => ({
              id: variant.id,
              name: variant.name,
              sku: variant.sku,
              priceCents: variant.priceCents,
              stock: variant.stock,
            }))}
          />

          <dl className="grid grid-cols-2 gap-4 border-t border-neutral-200 pt-6 text-sm">
            <div>
              <dt className="text-neutral-500">SKU range</dt>
              <dd className="font-mono text-xs text-neutral-900">
                {product.variants.map((variant) => variant.sku).join(', ')}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">Fulfilment</dt>
              <dd className="text-neutral-900">Dispatch within 2 working days of payment</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
