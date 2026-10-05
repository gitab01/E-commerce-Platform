import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { cartWith, checkoutInput, createSellableUnit, hasDatabase, prisma, resetTestData } from './setup';
import { checkout } from '@/lib/checkout';

const ATTEMPTS = 8;

describe.skipIf(!hasDatabase)('concurrent checkout of the last unit', () => {
  let fixture: Awaited<ReturnType<typeof createSellableUnit>>;

  beforeAll(async () => {
    await resetTestData();
    fixture = await createSellableUnit(1);
  });

  afterAll(async () => {
    await resetTestData();
    await prisma.$disconnect();
  });

  it('resolves to exactly one winner and never a negative count', async () => {
    const sessions = Array.from({ length: ATTEMPTS }, () => `test-session-${randomUUID()}`);
    await Promise.all(sessions.map((sessionId) => cartWith(sessionId, fixture.variantId, 1)));

    const results = await Promise.all(
      sessions.map((sessionId) => checkout(checkoutInput(), sessionId)),
    );

    const won = results.filter((result) => result.ok);
    const soldOut = results.filter((result) => !result.ok && result.reason === 'OUT_OF_STOCK');

    expect(won).toHaveLength(1);
    expect(soldOut).toHaveLength(ATTEMPTS - 1);

    const variant = await prisma.variant.findUniqueOrThrow({ where: { id: fixture.variantId } });
    expect(variant.stock).toBe(0);

    const orders = await prisma.order.findMany({
      where: { items: { some: { variantId: fixture.variantId } } },
      include: { items: true },
    });
    expect(orders).toHaveLength(1);
    expect(orders[0].items.reduce((sum, item) => sum + item.quantity, 0)).toBe(1);
    expect(orders[0].status).toBe('PENDING');
  });

  it('refuses a cart quantity the stock cannot cover', async () => {
    const fixture2 = await createSellableUnit(2);
    const sessionId = `test-session-${randomUUID()}`;
    await cartWith(sessionId, fixture2.variantId, 5);

    const result = await checkout(checkoutInput(), sessionId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('OUT_OF_STOCK');

    const variant = await prisma.variant.findUniqueOrThrow({ where: { id: fixture2.variantId } });
    expect(variant.stock).toBe(2);
    const order = await prisma.order.findFirst({ where: { items: { some: { variantId: fixture2.variantId } } } });
    expect(order).toBeNull();
  });

  it('re-reads the price from the database instead of trusting the request', async () => {
    const fixture3 = await createSellableUnit(3, 7_700);
    const sessionId = `test-session-${randomUUID()}`;
    await cartWith(sessionId, fixture3.variantId, 2);

    // Nothing in CheckoutInput carries a price, so a tampered client value has
    // no way to reach the totals: the order must be priced from the variant row.
    const result = await checkout({ ...checkoutInput(), totalCents: 1, unitPrice: 1 } as never, sessionId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.order.subtotalCents).toBe(15_400);
    const variant = await prisma.variant.findUniqueOrThrow({ where: { id: fixture3.variantId } });
    expect(variant.stock).toBe(1);
  });
});
