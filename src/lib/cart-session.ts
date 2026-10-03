import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';

const CART_COOKIE = 'qcart';
const CART_TTL_SECONDS = 60 * 60 * 24 * 30;

/**
 * The cart is keyed to an opaque server-issued session id held in an httpOnly
 * cookie. The client never chooses which cart it is writing to.
 */
export async function cartSessionId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(CART_COOKIE)?.value;
  if (existing) return existing;
  const id = randomBytes(24).toString('base64url');
  store.set(CART_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: CART_TTL_SECONDS,
  });
  return id;
}

export async function clearCartSession(): Promise<void> {
  const store = await cookies();
  store.delete(CART_COOKIE);
}
