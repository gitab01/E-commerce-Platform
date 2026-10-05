import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { formatMoney } from '@/lib/money';
import { STATUS_LABELS } from '@/lib/order-state';
import { SignOutButton } from '@/components/sign-out-button';
import { ReorderButton } from '@/components/reorder-button';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) redirect('/login?next=/account');

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: { items: { select: { quantity: true, unitPriceCents: true } } },
    orderBy: { createdAt: 'desc' },
    take: 25,
  });

  return (
    <div className="container-page max-w-3xl py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{user.name}</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {user.email}
            {user.role === 'ADMIN' && (
              <span className="ml-2 rounded-full bg-neutral-900 px-2 py-0.5 text-xs font-medium text-white">admin</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user.role === 'ADMIN' && (
            <Link href="/admin" className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100">
              Admin
            </Link>
          )}
          <SignOutButton />
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-sm font-semibold">Orders</h2>
        {orders.length === 0 ? (
          <p className="mt-3 rounded-md border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
            No orders on this account yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-200 border-y border-neutral-200">
            {orders.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link href={`/order/${order.reference}`} className="text-sm font-medium underline-offset-4 hover:underline">
                    {order.reference}
                  </Link>
                  <p className="text-xs text-neutral-500">
                    {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(order.createdAt)} ·{' '}
                    {order.items.length} line{order.items.length === 1 ? '' : 's'} · {formatMoney(order.totalCents)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-700">
                    {STATUS_LABELS[order.status]}
                  </span>
                  <ReorderButton reference={order.reference} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
