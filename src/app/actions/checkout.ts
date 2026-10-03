'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { checkout, type CheckoutResult } from '@/lib/checkout';
import { cartSessionId } from '@/lib/cart-session';
import { currentUser } from '@/lib/auth';
import { isProviderSelectable } from '@/lib/payments';
import type { PaymentProvider } from '@prisma/client';

const inputSchema = z.object({
  email: z.string().email().max(200),
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional(),
  addressLine: z.string().trim().min(4).max(240),
  city: z.string().trim().min(2).max(80),
  provider: z.enum(['STRIPE', 'CHAPA', 'DEMO']),
});

export type CheckoutActionResult =
  | { ok: true; redirectTo: string; reference: string }
  | { ok: false; reason: CheckoutResult extends { reason: infer R } ? R : string; fields?: Record<string, string> };

export async function submitCheckout(payload: unknown): Promise<CheckoutActionResult> {
  const parsed = inputSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      reason: 'INVALID_INPUT',
      fields: parsed.error.issues.reduce<Record<string, string>>((acc, issue) => {
        const key = String(issue.path[0] ?? 'form');
        acc[key] ??= issue.message;
        return acc;
      }, {}),
    };
  }

  const provider = parsed.data.provider as PaymentProvider;
  // Reject a provider the server has no credentials for, even if the browser
  // rendered a button for it before the env changed.
  if (!isProviderSelectable(provider)) {
    return { ok: false, reason: 'PROVIDER_UNAVAILABLE' };
  }

  const sessionId = await cartSessionId();
  const user = await currentUser();
  const result = await checkout({ ...parsed.data, userId: user?.id ?? null }, sessionId);

  if (!result.ok) return { ok: false, reason: result.reason };

  revalidatePath('/cart');
  revalidatePath('/products');
  return { ok: true, redirectTo: result.redirectTo, reference: result.order.reference };
}

/** Retry payment for an order whose gateway setup failed but whose stock is held. */
export async function resumeCheckout(rawReference: unknown): Promise<{ ok: true; redirectTo: string } | { ok: false; reason: string }> {
  const reference = z.string().min(4).max(12).safeParse(String(rawReference ?? ''));
  if (!reference.success) return { ok: false, reason: 'INVALID_REFERENCE' };
  const { resumePendingOrder } = await import('@/lib/fulfillment');
  return resumePendingOrder(reference.data);
}
