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

      <form
        className="scroll-x -mx-4 flex flex-nowrap items-center gap-2 px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
        action="/admin/customers"
      >
        <input
          name="q"
          defaultValue={term}
          placeholder="Search name or email"
          className="w-full max-w-xs shrink-0 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm placeholder:text-neutral-400"
        />
        <button type="submit" className="btn btn-secondary shrink-0">
          Search
        </button>
        {term && (
          <Link href="/admin/customers" className="shrink-0 text-xs text-neutral-500 underline-offset-4 hover:underline">
            Reset
          </Link>
        )}
      </form>

      <section className="card p-5">
        <h2 className="eyebrow">Add a store admin</h2>
        <p className="mt-1 text-xs text-neutral-600">
          Admins can change the catalogue, stock and every order, so only hand this out to people you trust.
        </p>
        <div className="mt-3">
          <StaffForm />
        </div>
      </section>

      <ul className="card divide-y divide-line">
        {users.map((user) => {
          const paid = user.orders.filter((order) => PAID_STATUSES.includes(order.status));
          const spend = paid.reduce((sum, order) => sum + order.totalCents, 0);
          const last = user.orders[0];
          return (
            <li
              key={user.id}
              className="grid grid-cols-3 items-center gap-x-3 gap-y-1 px-5 py-3.5 sm:grid-cols-[1fr_auto_auto_auto]"
            >
              <div className="col-span-3 min-w-0 sm:col-span-1">
                <Link
                  href={`/admin/customers/${user.id}`}
                  className="block truncate text-sm font-medium underline-offset-4 hover:underline"
                >
                  {user.name}
                </Link>
                <p className="truncate text-xs text-neutral-500">
                  {user.email} · joined{' '}
                  {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(user.createdAt)}
                  {last && ` · last order ${new Intl.DateTimeFormat('en-GB', { dateStyle: 'short' }).format(last.createdAt)}`}
                </p>
              </div>
              <span className="justify-self-end text-sm tabular-nums text-neutral-600">
                {user.orders.length} order{user.orders.length === 1 ? '' : 's'}
              </span>
              <span className="justify-self-end text-sm tabular-nums">{formatMoney(spend)}</span>
              <div className="flex justify-end">
                <span className={`pill ${user.role === 'ADMIN' ? 'pill-dark' : 'pill-neutral'}`}>
                  {user.role.toLowerCase()}
                </span>
              </div>
            </li>
          );
        })}
        {users.length === 0 && <li className="px-5 py-8 text-sm text-neutral-500">No accounts match that search.</li>}
      </ul>
    </div>
  );
}
