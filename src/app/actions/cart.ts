'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { cartSessionId } from '@/lib/cart-session';

const variantIdSchema = z.string().min(1);
const quantitySchema = z.number().int().min(1).max(99);

export type CartActionResult =
  | { ok: true; count: number; available: number }
  | { ok: false; reason: 'NOT_FOUND' | 'INVALID_QTY' | 'INSUFFICIENT_STOCK'; available: number };

async function cartCount(sessionId: string): Promise<number> {
  const items = await prisma.cartItem.findMany({ where: { cart: { sessionId } }, select: { quantity: true } });
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Quantities are capped at the stock that exists at write time, so the cart can
 * never hold a promise the checkout cannot keep. The checkout transaction is
 * still the authority — stock can move between these two calls.
 */
export async function addToCart(rawVariantId: unknown, rawQuantity: unknown): Promise<CartActionResult> {
  const variantId = variantIdSchema.safeParse(rawVariantId);
  const quantity = quantitySchema.safeParse(rawQuantity);
  if (!variantId.success || !quantity.success) return { ok: false, reason: 'INVALID_QTY', available: 0 };

  const sessionId = await cartSessionId();
  const variant = await prisma.variant.findUnique({
    where: { id: variantId.data },
    select: { id: true, stock: true, productId: true },
  });
  if (!variant) return { ok: false, reason: 'NOT_FOUND', available: 0 };

  const cart = await prisma.cart.upsert({
    where: { sessionId },
    create: { sessionId },
    update: {},
  });
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
  });
  const desired = (existing?.quantity ?? 0) + quantity.data;
  if (desired > variant.stock) {
    return { ok: false, reason: 'INSUFFICIENT_STOCK', available: variant.stock };
  }

  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
    create: { cartId: cart.id, variantId: variant.id, quantity: desired },
    update: { quantity: desired },
  });

  revalidatePath('/cart');
  return { ok: true, count: await cartCount(sessionId), available: variant.stock - desired };
}

export async function setCartItemQuantity(rawVariantId: unknown, rawQuantity: unknown): Promise<CartActionResult> {
  const variantId = variantIdSchema.safeParse(rawVariantId);
  const quantity = quantitySchema.safeParse(rawQuantity);
  if (!variantId.success || !quantity.success) return { ok: false, reason: 'INVALID_QTY', available: 0 };

  const sessionId = await cartSessionId();
  const variant = await prisma.variant.findUnique({
    where: { id: variantId.data },
    select: { id: true, stock: true },
  });
  if (!variant) return { ok: false, reason: 'NOT_FOUND', available: 0 };
  if (quantity.data > variant.stock) return { ok: false, reason: 'INSUFFICIENT_STOCK', available: variant.stock };

  const cart = await prisma.cart.findUnique({ where: { sessionId } });
  if (!cart) return { ok: true, count: 0, available: variant.stock };

  if (quantity.data === 0) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id, variantId: variant.id } });
  } else {
    await prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
      create: { cartId: cart.id, variantId: variant.id, quantity: quantity.data },
      update: { quantity: quantity.data },
    });
  }

  revalidatePath('/cart');
  return { ok: true, count: await cartCount(sessionId), available: variant.stock };
}

export async function clearCart(): Promise<{ ok: true }> {
  const sessionId = await cartSessionId();
  await prisma.cartItem.deleteMany({ where: { cart: { sessionId } } });
  revalidatePath('/cart');
  return { ok: true };
}

/** Stock moved while a page was cached: drop the stale ISR render for that product. */
export function revalidateProductSlug(slug: string) {
  revalidatePath(`/products/${slug}`);
  revalidatePath('/products');
}
