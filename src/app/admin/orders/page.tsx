import Link from 'next/link';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { formatMoney } from '@/lib/money';
import { STATUS_LABELS, canTransition } from '@/lib/order-state';
import { AdminStatusControl } from '@/components/admin-status-control';
import type { OrderStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

const ALL_STATUSES = Object.keys(STATUS_LABELS) as OrderStatus[];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const { status, q, page } = await searchParams;
  const statusFilter = ALL_STATUSES.includes(status as OrderStatus) ? (status as OrderStatus) : undefined;
  const currentPage = Math.max(1, Number.parseInt(page ?? '1', 10) || 1);
  const pageSize = 25;

  const where: Prisma.OrderWhereInput = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(q
      ? {
          OR: [{ reference: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }],
        }
      : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { items: { select: { quantity: true, title: true, variantName: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
      <p className="mt-1 text-sm text-neutral-600">{total} matching orders.</p>

      <form className="mt-5 flex flex-wrap items-center gap-2 text-sm" action="/admin/orders">
        <select
          name="status"
          defaultValue={statusFilter ?? ''}
          className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm"
          aria-label="Filter by status"
        >
          <option value="">Any status</option>
          {ALL_STATUSES.map((entry) => (
            <option key={entry} value={entry}>
              {STATUS_LABELS[entry]}
            </option>
          ))}
        </select>
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder="Reference or email"
          className="w-44 rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm"
        />
        <button type="submit" className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800">
          Filter
        </button>
        {statusFilter && (
          <Link href="/admin/orders" className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100">
            Clear
          </Link>
        )}
      </form>

      <ul className="mt-6 divide-y divide-neutral-200 border-y border-neutral-200">
        {orders.map((order) => {
          const nextOptions = ALL_STATUSES.filter((candidate) => canTransition(order.status, candidate));
          return (
            <li key={order.id} className="grid grid-cols-1 gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-mono text-sm font-medium underline-offset-4 hover:underline"
                  >
                    {order.reference}
                  </Link>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">
                    {STATUS_LABELS[order.status]}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(order.createdAt)}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-neutral-700">{order.email}</p>
                <p className="truncate text-xs text-neutral-500">
                  {order.items
                    .map((item) => `${item.quantity} × ${item.title} (${item.variantName})`)
                    .join(', ')}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <span className="tabular-nums text-sm font-medium">{formatMoney(order.totalCents)}</span>
                <AdminStatusControl
                  orderId={order.id}
                  reference={order.reference}
                  current={order.status}
                  options={nextOptions.map((value) => ({ value, label: STATUS_LABELS[value] }))}
                />
              </div>
            </li>
          );
        })}
        {orders.length === 0 && <li className="py-8 text-center text-sm text-neutral-500">No orders match that filter.</li>}
      </ul>

      {pages > 1 && (
        <nav className="mt-6 flex items-center gap-2 text-sm" aria-label="Pagination">
          {Array.from({ length: Math.min(pages, 8) }, (_, index) => index + 1).map((number) => (
            <Link
              key={number}
              href={`/admin/orders?page=${number}${statusFilter ? `&status=${statusFilter}` : ''}${q ? `&q=${q}` : ''}`}
              className={`rounded-md px-2.5 py-1 ${number === currentPage ? 'bg-neutral-900 text-white' : 'border border-neutral-300 text-neutral-700 hover:bg-neutral-100'}`}
            >
              {number}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
