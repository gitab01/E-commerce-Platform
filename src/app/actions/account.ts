'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { hashPassword, verifyPassword, startSession, destroySession, guardAdmin } from '@/lib/auth';
import { advanceOrder, reconcileStaleReservations } from '@/lib/fulfillment';
import { revalidateProductSlug } from '@/lib/catalog';
import type { OrderStatus } from '@prisma/client';

const credentialsSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
  name: z.string().trim().min(2).max(120).optional(),
});

export type AuthResult = { ok: true } | { ok: false; reason: string };

export async function registerWithPassword(payload: unknown): Promise<AuthResult> {
  const parsed = credentialsSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, reason: 'INVALID_INPUT' };
  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return { ok: false, reason: 'EMAIL_TAKEN' };

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      name: name ?? email.split('@')[0],
      passwordHash: hashPassword(password),
    },
  });
  await startSession(user.id);
  return { ok: true };
}

export async function loginWithPassword(payload: unknown): Promise<AuthResult> {
  const parsed = credentialsSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, reason: 'INVALID_INPUT' };
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  // Same answer whether the address is unknown or the password is wrong.
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return { ok: false, reason: 'BAD_CREDENTIALS' };
  }
  await startSession(user.id);
  return { ok: true };
}

export async function signOut(): Promise<void> {
  await destroySession();
  revalidatePath('/account');
  redirect('/');
}

export async function createAccountAfterPayment(payload: unknown): Promise<AuthResult> {
  const parsed = credentialsSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, reason: 'INVALID_INPUT' };
  const result = await registerWithPassword(parsed.data);
  if (result.ok) revalidatePath('/account');
  return result;
}

export type AdminOrderResult = { ok: true } | { ok: false; reason: string };

export async function setOrderStatus(rawId: unknown, to: OrderStatus, note?: string): Promise<AdminOrderResult> {
  const user = await guardAdmin();
  if (!user) return { ok: false, reason: 'FORBIDDEN' };
  const id = z.string().cuid().safeParse(String(rawId ?? ''));
  if (!id.success) return { ok: false, reason: 'INVALID_ID' };

  const result = await advanceOrder({ orderId: id.data, to, actor: `admin:${user.email}`, note });
  revalidatePath('/admin');
  revalidatePath(`/admin/orders`);
  revalidatePath(`/admin/orders/${id.data}`);
  return result.ok ? { ok: true } : { ok: false, reason: result.error };
}

export async function adjustStock(rawVariantId: unknown, delta: number, reason: string): Promise<AdminOrderResult> {
  const user = await guardAdmin();
  if (!user) return { ok: false, reason: 'FORBIDDEN' };
  const variantId = z.string().cuid().safeParse(String(rawVariantId ?? ''));
  const amount = z.number().int().min(-10_000).max(10_000).safeParse(delta);
  if (!variantId.success || !amount.success) return { ok: false, reason: 'INVALID_INPUT' };

  // The CHECK constraint is the last line of defence: a negative adjustment
  // below zero is rejected by Postgres, not by this function.
  try {
    const updated = await prisma.variant.update({
      where: { id: variantId.data },
      data: { stock: { increment: amount.data } },
      select: { id: true, stock: true, sku: true, productId: true, product: { select: { slug: true } } },
    });
    await prisma.auditLog.create({
      data: {
        actor: `admin:${user.email}`,
        action: 'stock.adjust',
        target: updated.sku,
        detail: `${amount.data > 0 ? '+' : ''}${amount.data} — ${reason || 'no note'}`,
      },
    });
    revalidateProductSlug(updated.product.slug);
    revalidatePath('/admin/inventory');
    return { ok: true };
  } catch (error) {
    const message = (error as Error).message ?? '';
    if (message.includes('variants_stock_non_negative') || message.includes('check constraint')) {
      return { ok: false, reason: 'WOULD_GO_NEGATIVE' };
    }
    throw error;
  }
}

export async function runReconciliationNow(): Promise<{ ok: true; summary: string } | { ok: false; reason: string }> {
  const user = await guardAdmin();
  if (!user) return { ok: false, reason: 'FORBIDDEN' };
  const report = await reconcileStaleReservations();
  return {
    ok: true,
    summary: `checked ${report.checked}, expired ${report.expired}, rescued to paid ${report.rescuedToPaid}${
      report.errors.length ? `, errors ${report.errors.length}` : ''
    }`,
  };
}
