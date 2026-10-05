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
      className="group flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white hover:border-neutral-400"
    >
      <div className="relative aspect-4/3 w-full bg-neutral-50">
        <Image src={product.image} alt={product.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-contain p-6" />
      </div>
      <div className="flex flex-1 flex-col gap-1 border-t border-neutral-200 p-4">
        <p className="text-xs uppercase tracking-wide text-neutral-500">{product.category.name}</p>
        <h3 className="text-sm font-semibold text-neutral-950">{product.title}</h3>
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="text-sm tabular-nums text-neutral-900">
            {lead ? formatMoney(lead.priceCents) : '—'}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              stock === 0
                ? 'bg-neutral-900 text-white'
                : low
                  ? 'bg-neutral-100 text-neutral-800'
                  : 'text-neutral-500'
            }`}
          >
            {stock === 0 ? 'Sold out' : low ? `Only ${stock} left` : `${stock} in stock`}
          </span>
        </div>
      </div>
    </Link>
  );
}
