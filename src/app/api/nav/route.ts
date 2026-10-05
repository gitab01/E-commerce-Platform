import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { peekCartSessionId } from '@/lib/cart-session';
import { currentUser } from '@/lib/auth';

/**
 * The header's session-dependent parts (who is signed in, how many items are in
 * the cart) are fetched here instead of being read during render, so the
 * storefront pages can stay prerendered.
 */
export async function GET() {
  const sessionId = await peekCartSessionId();
  const user = await currentUser();
  const cart = sessionId
    ? await prisma.cart.findUnique({ where: { sessionId }, select: { items: { select: { quantity: true } } } })
    : null;
  return NextResponse.json({
    count: (cart?.items ?? []).reduce((sum, item) => sum + item.quantity, 0),
    signedIn: !!user,
    admin: user?.role === 'ADMIN',
  });
}
