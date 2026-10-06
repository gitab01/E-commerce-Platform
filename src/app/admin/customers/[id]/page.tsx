import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import { STATUS_LABELS } from '@/lib/order-state';
import { RoleControl } from '@/components/role-control';
import { DeleteControl } from '@/components/delete-control';

export const dynamic = 'force-dynamic';

export default async function AdminCustomerPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const [user, liveSessions] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          include: { items: { select: { title: true, quantity: true } } },
        },
      },
    }),
    prisma.session.count({ where: { userId: id, expiresAt: { gt: new Date() } } }),
  ]);
  if (!user) notFound();

  const paid = user.orders.filter((order) => ['PAID', 'SHIPPED', 'DELIVERED'].includes(order.status));
  const spend = paid.reduce((sum, order) => sum + order.totalCents, 0);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <Link href="/admin/customers" className="text-xs text-neutral-500 underline-offset-4 hover:underline">
          ← Customers
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{user.name}</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {user.email} · joined{' '}
          {new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' }).format(user.createdAt)} ·{' '}
          {liveSessions} active session{liveSessions === 1 ? '' : 's'}
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Role" value={user.role === 'ADMIN' ? 'Admin' : 'Customer'} />
        <Stat label="Orders" value={String(user.orders.length)} />
        <Stat label="Confirmed spend" value={formatMoney(spend)} hint={`${paid.length} paid`} />
        <Stat
          label="Open"
          value={String(user.orders.filter((order) => order.status === 'PENDING').length)}
          hint="reserved stock"
        />
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 p-5">
        <div>
          <h2 className="text-sm font-semibold">Access</h2>
          <p className="mt-1 max-w-md text-sm text-neutral-600">
            Promoting an account grants the whole dashboard, including these controls. The role is re-read from the
            database on every request, and demotion takes effect on the next one.
          </p>
        </div>
        <RoleControl userId={user.id} current={user.role} />
      </section>

      <section>
        <h2 className="text-sm font-semibold">Order history</h2>
        <ul className="mt-3 divide-y divide-neutral-200 border-y border-neutral-200 text-sm">
          {user.orders.map((order) => (
            <li key={order.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5">
              <Link href={`/admin/orders/${order.id}`} className="font-medium underline-offset-4 hover:underline">
                {order.reference}
              </Link>
              <span className="text-xs text-neutral-500">
                {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(order.createdAt)}
              </span>
              <span className="text-xs text-neutral-600">
                {order.items.map((item) => `${item.quantity}× ${item.title}`).join(', ') || 'no lines'}
              </span>
              <span className="tabular-nums">{formatMoney(order.totalCents)}</span>
              <span className="text-xs text-neutral-600">{STATUS_LABELS[order.status]}</span>
            </li>
          ))}
          {user.orders.length === 0 && <li className="py-4 text-sm text-neutral-500">This account has never ordered.</li>}
        </ul>
      </section>

      <section className="rounded-lg border border-neutral-200 p-5">
        <h2 className="text-sm font-semibold">Delete this account</h2>
        <p className="mt-1 max-w-xl text-sm text-neutral-600">
          {user.orders.length > 0
            ? 'Orders are linked to this account, so it stays. Deleting would rewrite them as guest purchases and lose the link.'
            : 'No orders are linked to this account, so it can be removed. Its sessions are ended at the same time.'}
        </p>
        <div className="mt-3">
          <DeleteControl
            kind="customer"
            id={user.id}
            label="Delete account"
            redirectTo="/admin/customers"
          />
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight">{value}</p>
      {hint && <p className="text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}
