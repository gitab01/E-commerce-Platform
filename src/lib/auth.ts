import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { prisma } from './db';
import type { Role } from '@prisma/client';

const SESSION_COOKIE = 'qsid';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${derived.toString('base64')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltB64, hashB64] = stored.split('$');
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const derived = scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length);
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function startSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });
  await prisma.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session
      .deleteMany({ where: { tokenHash: hashToken(token) } })
      .catch(() => undefined);
  }
  store.delete(SESSION_COOKIE);
}

export type AuthUser = { id: string; email: string; name: string; role: Role };

export async function currentUser(): Promise<AuthUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  const { id, email, name, role } = session.user;
  return { id, email, name, role };
}

/**
 * Admin routes are gated twice: by this DB-backed check on every request and by
 * the layout-level guard that renders the access-denied screen. A revoked admin
 * therefore loses access on their next request, not their next deploy.
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await currentUser();
  if (!user) throw new Error('AUTH_REQUIRED');
  if (user.role !== 'ADMIN') throw new Error('ADMIN_REQUIRED');
  return user;
}
