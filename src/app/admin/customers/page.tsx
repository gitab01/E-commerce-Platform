import Link from 'next/link';
import { prisma } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import { StaffForm } from '@/components/staff-form';

export const dynamic = 'force-dynamic';

const PAID_STATUSES = ['PAID', 'SHIPPED', 'DELIVERED'];

export default async function AdminCustomersPage(props: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await props.searchParams;
  const term = q.trim();

  const [users, guests, adminCount] = await Promise.all([
    prisma.user.findMany({
      where: term
        ? {
            OR: [
              { email: { contains: term, mode: 'insensitive' } },
              { name: { contains: term, mode: 'insensitive' } },
            ],
          }
        : {},
      include: {
        orders: {
          select: { id: true, reference: true, status: true, totalCents: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.order.count({ where: { userId: null } }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {users.length} account{users.length === 1 ? '' : 's'} shown · {adminCount} admin · {guests} guest order
          {guests === 1 ? '' : 's'} without an account. Spend counts only orders a gateway has confirmed.
        </p>
      </div>

      <form className="flex flex-wrap items-center gap-2" action="/admin/customers">
        <input
          name="q"
          defaultValue={term}
          placeholder="Search name or email"
          className="w-full max-w-xs rounded-md border border-neutral-300 px-3 py-2 text-sm placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
        />
        <button type="submit" className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100">
          Search
        </button>
        {term && (
          <Link href="/admin/customers" className="text-xs text-neutral-500 underline-offset-4 hover:underline">
            Reset
          </Link>
        )}
      </form>

      <section className="rounded-lg border border-dashed border-neutral-300 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Add a store admin</h2>
        <p className="mt-1 text-xs text-neutral-600">
          Admins can change the catalogue, stock and every order, so only hand this out to people you trust.
        </p>
        <div className="mt-3">
          <StaffForm />
        </div>
      </section>

      <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
        {users.map((user) => {
          const paid = user.orders.filter((order) => PAID_STATUSES.includes(order.status));
          const spend = paid.reduce((sum, order) => sum + order.totalCents, 0);
          const last = user.orders[0];
          return (
            <li key={user.id} className="grid grid-cols-2 gap-x-4 gap-y-1 py-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
              <div className="col-span-2 min-w-0 sm:col-span-1">
                <Link href={`/admin/customers/${user.id}`} className="block truncate text-sm font-medium underline-offset-4 hover:underline">
                  {user.name}
                </Link>
                <p className="truncate text-xs text-neutral-500">
                  {user.email} · joined{' '}
                  {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(user.createdAt)}
                  {last && ` · last order ${new Intl.DateTimeFormat('en-GB', { dateStyle: 'short' }).format(last.createdAt)}`}
                </p>
              </div>
              <span className="text-sm tabular-nums text-neutral-600">
                {user.orders.length} order{user.orders.length === 1 ? '' : 's'}
              </span>
              <span className="text-sm tabular-nums">{formatMoney(spend)}</span>
              <span
                className={`w-fit rounded-full px-2 py-0.5 text-xs ${
                  user.role === 'ADMIN' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700'
                }`}
              >
                {user.role.toLowerCase()}
              </span>
            </li>
          );
        })}
        {users.length === 0 && <li className="py-6 text-sm text-neutral-500">No accounts match that search.</li>}
      </ul>
    </div>
  );
}
