import Link from 'next/link';
import Image from 'next/image';
import { formatMoney } from '@/lib/money';
import { leadVariant, totalStock } from '@/lib/catalog';

type Product = {
  id: string;
  slug: string;
  title: string;
  image: string;
  description: string;
  category: { name: string; slug: string };
  variants: { id: string; priceCents: number; stock: number; name: string }[];
};

export function ProductCard({ product }: { product: Product }) {
  const lead = leadVariant(product.variants);
  const stock = totalStock(product.variants);
  const low = stock > 0 && stock <= 3;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="card group flex flex-col overflow-hidden transition-colors hover:border-neutral-400"
    >
      <div className="relative aspect-4/3 w-full bg-neutral-50">
        <Image src={product.image} alt={product.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-contain p-6" />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="eyebrow">{product.category.name}</p>
        <h3 className="mt-1 text-[0.9375rem] font-semibold leading-6 text-ink">{product.title}</h3>
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <span className="text-base font-semibold tabular-nums tracking-tight text-ink">
            {lead ? formatMoney(lead.priceCents) : '—'}
          </span>
          <span
            className={`pill ${
              stock === 0 ? 'pill-danger' : low ? 'pill-neutral' : 'text-neutral-500'
            }`}
          >
            {stock > 0 && <span className="dot" aria-hidden="true" />}
            {stock === 0 ? 'Sold out' : low ? `Only ${stock} left` : `${stock} in stock`}
          </span>
        </div>
      </div>
    </Link>
  );
}
