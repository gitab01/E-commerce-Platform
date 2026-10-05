import { prisma, MONEY_TX } from './db';
import { addShipping } from './money';
import { getGateway } from './payments';
import type { CheckoutContext } from './payments/types';
import type { Order, OrderItem, PaymentProvider } from '@prisma/client';

export const RESERVATION_TTL_MS = 30 * 60 * 1000;

export type CartLine = CheckoutContext['lines'][number] & {
  variantId: string;
  variantName: string;
  stock: number;
};

export type CheckoutInput = {
  email: string;
  fullName: string;
  phone?: string;
  addressLine: string;
  city: string;
  userId?: string | null;
  provider: PaymentProvider;
};

export type CheckoutError =
  | 'EMPTY_CART'
  | 'OUT_OF_STOCK'
  | 'PROVIDER_UNAVAILABLE'
  | 'INVALID_INPUT'
  | 'PAYMENT_SETUP_FAILED';

export type CheckoutResult =
  | { ok: true; order: Order; redirectTo: string }
  | { ok: false; reason: CheckoutError; soldOutSkus?: string[] };

/** Rolls the whole transaction back when thrown, leaving stock untouched. */
class OutOfStock extends Error {
  constructor(readonly skus: string[]) {
    super('out of stock');
    this.name = 'OutOfStock';
  }
}

export async function loadCartLines(sessionId: string): Promise<CartLine[]> {
  const cart = await prisma.cart.findUnique({
    where: { sessionId },
    include: {
      items: { include: { variant: { include: { product: { select: { title: true, active: true } } } } } },
    },
  });
  if (!cart) return [];
  return cart.items
    .filter((item) => item.variant.product.active)
    .map((item) => ({
      variantId: item.variant.id,
      sku: item.variant.sku,
      title: item.variant.product.title,
      variantName: item.variant.name,
      quantity: item.quantity,
      // Read from the row, not the request: a client-sent price is a suggestion.
      unitPriceCents: item.variant.priceCents,
      stock: item.variant.stock,
    }));
}

export function totalsFor(lines: CartLine[]): { subtotalCents: number; shippingCents: number; totalCents: number } {
  const subtotalCents = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  const shippingCents = addShipping(subtotalCents);
  return { subtotalCents, shippingCents, totalCents: subtotalCents + shippingCents };
}

export async function reserveAndCreateOrder(
  input: CheckoutInput,
  sessionId: string,
): Promise<{ order: Order & { items: OrderItem[] }; lines: CartLine[] }> {
  const lines = await loadCartLines(sessionId);
  if (lines.length === 0) throw new OutOfStock([]);
  const { subtotalCents, shippingCents, totalCents } = totalsFor(lines);

  return prisma.$transaction(async (tx) => {
    for (const line of lines) {
      const reserved = await tx.variant.updateMany({
        where: { id: line.variantId, stock: { gte: line.quantity } },
        data: { stock: { decrement: line.quantity } },
      });
      if (reserved.count === 0) throw new OutOfStock([line.sku]);
    }

    const cart = await tx.cart.findUnique({ where: { sessionId }, select: { id: true } });
    const order = await tx.order.create({
      data: {
        reference: newReference(),
        userId: input.userId ?? null,
        email: input.email,
        fullName: input.fullName,
        phone: input.phone ?? null,
        addressLine: input.addressLine,
        city: input.city,
        country: process.env.BASE_COUNTRY ?? 'Ethiopia',
        subtotalCents,
        shippingCents,
        totalCents,
        provider: input.provider,
        currency: process.env.BASE_CURRENCY ?? 'ETB',
        expiresAt: new Date(Date.now() + RESERVATION_TTL_MS),
        items: {
          create: lines.map((line) => ({
            variantId: line.variantId,
            sku: line.sku,
            title: line.title,
            variantName: line.variantName,
            unitPriceCents: line.unitPriceCents,
            quantity: line.quantity,
          })),
        },
        events: { create: { actor: 'checkout', to: 'PENDING', note: 'Stock reserved' } },
      },
      include: { items: true },
    });

    if (cart) await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    return { order, lines };
  }, MONEY_TX);
}

function newReference(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `AB${suffix}`;
}

/**
 * Payment setup can fail after the reservation committed. The stock is still
 * held and the order row exists, so the customer can retry without buying the
 * same units twice.
 */
export async function resumeCheckoutFor(
  reference: string,
): Promise<{ ok: true; redirectTo: string } | { ok: false; reason: 'NOT_FOUND' | 'NOT_PENDING' | 'EXPIRED' | 'PAYMENT_SETUP_FAILED' }> {
  const order = await prisma.order.findUnique({
    where: { reference },
    include: { items: true },
  });
  if (!order) return { ok: false, reason: 'NOT_FOUND' };
  if (order.status !== 'PENDING') return { ok: false, reason: 'NOT_PENDING' };
  if (order.expiresAt < new Date()) return { ok: false, reason: 'EXPIRED' };
  if (order.providerSessionId) {
    const gateway = getGateway(order.provider);
    const redirect = redirectFor(order, gateway.provider);
    if (redirect) return { ok: true, redirectTo: redirect };
  }

  const gateway = getGateway(order.provider);
  try {
    const created = await gateway.createCheckout({
      order,
      lines: order.items.map((item) => ({
        sku: item.sku,
        title: item.title,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
      })),
    });
    await prisma.order.update({ where: { id: order.id }, data: { providerSessionId: created.providerSessionId } });
    return { ok: true, redirectTo: created.redirectTo };
  } catch (error) {
    console.error('payment retry failed', error);
    return { ok: false, reason: 'PAYMENT_SETUP_FAILED' };
  }
}

/** A held session can be re-opened by its own reference without creating another. */
function redirectFor(order: Order & { items: OrderItem[] }, provider: PaymentProvider): string | null {
  if (provider === 'DEMO' && order.providerSessionId) {
    const token = order.providerSessionId.replace(/^demo_[^_]+_/, '');
    return `/demo-pay/${token}?reference=${order.reference}`;
  }
  return null;
}

export async function checkout(input: CheckoutInput, sessionId: string): Promise<CheckoutResult> {
  const gateway = getGateway(input.provider);
  if (!gateway.isConfigured()) return { ok: false, reason: 'PROVIDER_UNAVAILABLE' };

  let order: Order & { items: OrderItem[] };
  let lines: CartLine[];
  try {
    ({ order, lines } = await reserveAndCreateOrder(input, sessionId));
  } catch (error) {
    if (error instanceof OutOfStock) {
      return error.skus.length
        ? { ok: false, reason: 'OUT_OF_STOCK', soldOutSkus: error.skus }
        : { ok: false, reason: 'EMPTY_CART' };
    }
    throw error;
  }

  // Committed: stock is held and the order exists before any gateway call, so a
  // webhook can always resolve the session to a row.
  try {
    const created = await gateway.createCheckout({
      order,
      lines: lines.map(({ sku, title, quantity, unitPriceCents }) => ({ sku, title, quantity, unitPriceCents })),
    });
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { providerSessionId: created.providerSessionId },
    });
    return { ok: true, order: updated, redirectTo: created.redirectTo };
  } catch (error) {
    console.error('payment setup failed', error);
    return { ok: false, reason: 'PAYMENT_SETUP_FAILED' };
  }
}
