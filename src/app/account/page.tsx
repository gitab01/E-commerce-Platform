import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { formatMoney } from '@/lib/money';
import { STATUS_LABELS, STATUS_TONES } from '@/lib/order-state';
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
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-neutral-600">
            {user.email}
            {user.role === 'ADMIN' && <span className="pill pill-dark">admin</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user.role === 'ADMIN' && (
            <Link href="/admin" className="btn btn-secondary">
              Admin
            </Link>
          )}
          <SignOutButton />
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-sm font-semibold">Orders</h2>
        {orders.length === 0 ? (
          <p className="card mt-4 p-8 text-center text-sm text-neutral-500">No orders on this account yet.</p>
        ) : (
          <ul className="card mt-4 divide-y divide-line">
            {orders.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <Link
                    href={`/order/${order.reference}`}
                    className="text-sm font-medium tabular-nums underline-offset-4 hover:underline"
                  >
                    {order.reference}
                  </Link>
                  <p className="text-xs text-neutral-500">
                    {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(order.createdAt)} ·{' '}
                    {order.items.length} line{order.items.length === 1 ? '' : 's'} · {formatMoney(order.totalCents)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`pill ${STATUS_TONES[order.status]}`}>{STATUS_LABELS[order.status]}</span>
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
