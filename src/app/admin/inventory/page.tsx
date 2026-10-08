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
        <ul className="card mt-6 divide-y divide-line">
          {variants.map((variant) => (
            <li
              key={variant.id}
              className="grid grid-cols-1 items-center gap-3 px-5 py-3.5 sm:grid-cols-[1fr_auto_auto]"
            >
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
              {variant.stock === 0 ? (
                <span className="pill pill-danger justify-self-start sm:justify-self-end">Sold out</span>
              ) : variant.stock <= 3 ? (
                <span className="pill pill-neutral justify-self-start tabular-nums sm:justify-self-end">
                  {variant.stock} left
                </span>
              ) : (
                <span className="justify-self-start text-sm tabular-nums text-neutral-500 sm:justify-self-end">
                  {variant.stock} in stock
                </span>
              )}
              <StockAdjust variantId={variant.id} sku={variant.sku} stock={variant.stock} />
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-semibold">Recent operations</h2>
        <ul className="card mt-3 divide-y divide-line text-sm">
          {audit.map((entry) => (
            <li key={entry.id} className="grid grid-cols-1 gap-1 px-5 py-3 sm:grid-cols-[9rem_8rem_1fr]">
              <span className="text-xs tabular-nums text-neutral-500">
                {new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeStyle: 'short' }).format(entry.createdAt)}
              </span>
              <span className="text-xs text-neutral-700">{entry.actor}</span>
              <span className="text-neutral-900">
                {entry.action} <span className="font-mono text-xs text-neutral-500">{entry.target}</span> — {entry.detail}
              </span>
            </li>
          ))}
          {audit.length === 0 && <li className="px-5 py-6 text-sm text-neutral-500">No admin operations recorded yet.</li>}
        </ul>
      </section>
    </div>
  );
}
