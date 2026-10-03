import Link from 'next/link';
import { prisma } from '@/lib/db';
import { cartSessionId } from '@/lib/cart-session';
import { currentUser } from '@/lib/auth';
import { CartBadge } from './cart-badge';

export async function SiteHeader() {
  const sessionId = await cartSessionId();
  const user = await currentUser();
  const cart = await prisma.cart.findUnique({
    where: { sessionId },
    select: { items: { select: { quantity: true } } },
  });
  const count = (cart?.items ?? []).reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white">
      <div className="container-page flex h-14 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm font-semibold tracking-tight text-neutral-900">
            E-commerce Platform
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/products" className="rounded-md px-2 py-1 text-neutral-700 hover:bg-neutral-100">
              Products
            </Link>
            {user?.role === 'ADMIN' && (
              <Link href="/admin" className="rounded-md px-2 py-1 text-neutral-700 hover:bg-neutral-100">
                Admin
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-1 text-sm">
          {user ? (
            <Link href="/account" className="rounded-md px-2 py-1 text-neutral-700 hover:bg-neutral-100">
              {user.name.split(' ')[0]}
            </Link>
          ) : (
            <Link href="/login" className="rounded-md px-2 py-1 text-neutral-700 hover:bg-neutral-100">
              Sign in
            </Link>
          )}
          <CartBadge serverCount={count} />
        </div>
      </div>
    </header>
  );
}
