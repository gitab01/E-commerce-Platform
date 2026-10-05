import Link from 'next/link';
import { prisma } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import { StockAdjust } from '@/components/stock-adjust';

export const dynamic = 'force-dynamic';

export default async function AdminInventoryPage() {
  const variants = await prisma.variant.findMany({
    include: { product: { select: { slug: true, title: true, active: true } } },
    orderBy: [{ stock: 'asc' }, { product: { title: 'asc' } }],
  });
  const audit = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10 });

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {variants.length} sellable variants. Negative adjustments are refused by a database CHECK constraint, not by
          the form.
        </p>
        <ul className="mt-6 divide-y divide-neutral-200 border-y border-neutral-200">
          {variants.map((variant) => (
            <li key={variant.id} className="grid grid-cols-1 gap-3 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
              <div className="min-w-0">
                <Link
                  href={`/products/${variant.product.slug}`}
                  className="truncate text-sm font-medium underline-offset-4 hover:underline"
                >
                  {variant.product.title} — {variant.name}
                </Link>
                <p className="text-xs text-neutral-500">
                  <span className="font-mono">{variant.sku}</span> · {formatMoney(variant.priceCents)} ·{' '}
                  {variant.product.active ? 'listed' : 'hidden'}
                </p>
              </div>
              <span
                className={`text-sm tabular-nums ${variant.stock === 0 ? 'font-semibold text-neutral-900' : 'text-neutral-600'}`}
              >
                {variant.stock} in stock
              </span>
              <StockAdjust variantId={variant.id} sku={variant.sku} stock={variant.stock} />
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-semibold">Recent operations</h2>
        <ul className="mt-3 divide-y divide-neutral-200 border-y border-neutral-200 text-sm">
          {audit.map((entry) => (
            <li key={entry.id} className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-[9rem_8rem_1fr]">
              <span className="text-xs tabular-nums text-neutral-500">
                {new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeStyle: 'short' }).format(entry.createdAt)}
              </span>
              <span className="text-xs text-neutral-700">{entry.actor}</span>
              <span className="text-neutral-900">
                {entry.action} <span className="font-mono text-xs text-neutral-500">{entry.target}</span> — {entry.detail}
              </span>
            </li>
          ))}
          {audit.length === 0 && <li className="py-4 text-sm text-neutral-500">No admin operations recorded yet.</li>}
        </ul>
      </section>
    </div>
  );
}
