import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { cartWith, checkoutInput, createSellableUnit, hasDatabase, prisma, resetTestData } from './setup';
import { checkout } from '@/lib/checkout';
import { cancelOrder, markOrderPaid, reconcileStaleReservations } from '@/lib/fulfillment';

describe.skipIf(!hasDatabase)('payment webhooks', () => {
  async function pendingOrder(stock = 4) {
    const fixture = await createSellableUnit(stock);
    const sessionId = `test-session-${randomUUID()}`;
    await cartWith(sessionId, fixture.variantId, 1);
    const result = await checkout(checkoutInput(), sessionId);
    if (!result.ok) throw new Error(`test setup failed: ${result.reason}`);
    return { fixture, order: result.order };
  }

  beforeAll(async () => {
    await resetTestData();
  });

  afterAll(async () => {
    await resetTestData();
    await prisma.$disconnect();
  });

  it('is idempotent on the event id: a retry does not double-apply', async () => {
    const { order, fixture } = await pendingOrder();
    const externalId = `evt_${randomUUID()}`;

    const first = await markOrderPaid({ provider: 'DEMO', externalId, orderReference: order.reference, raw: {} });
    const second = await markOrderPaid({ provider: 'DEMO', externalId, orderReference: order.reference, raw: {} });

    expect(first).toMatchObject({ ok: true, applied: true });
    expect(second).toMatchObject({ ok: true, applied: false });

    const paid = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(paid.status).toBe('PAID');
    expect((await prisma.paymentEvent.count({ where: { provider: 'DEMO', orderId: order.id } }))).toBe(1);
    const variant = await prisma.variant.findUniqueOrThrow({ where: { id: fixture.variantId } });
    expect(variant.stock).toBe(3);
  });

  it('resolves a webhook that arrives before the session id is stored', async () => {
    const { order } = await pendingOrder();
    await prisma.order.update({ where: { id: order.id }, data: { providerSessionId: null } });

    const result = await markOrderPaid({
      provider: 'DEMO',
      externalId: `evt_${randomUUID()}`,
      // No session id known yet — only the client reference the gateway echoes back.
      orderReference: order.reference,
      raw: {},
    });

    expect(result).toMatchObject({ ok: true, applied: true });
    const paid = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(paid.status).toBe('PAID');
  });

  it('refuses to revive an expired order and records the rejection', async () => {
    const { order } = await pendingOrder();
    await cancelOrder({ orderId: order.id, actor: 'test', status: 'EXPIRED', note: 'forced' });

    const result = await markOrderPaid({
      provider: 'DEMO',
      externalId: `evt_${randomUUID()}`,
      orderReference: order.reference,
      raw: {},
    });
    expect(result).toMatchObject({ ok: true, applied: false });

    const after = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { events: { where: { note: { startsWith: 'rejected' } } } },
    });
    expect(after.status).toBe('EXPIRED');
    expect(after.events.length).toBeGreaterThan(0);
  });

  it('releases stock from a PENDING order whose window elapsed', async () => {
    const { order, fixture } = await pendingOrder();
    await prisma.order.update({
      where: { id: order.id },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    const report = await reconcileStaleReservations();
    expect(report.expired).toBeGreaterThanOrEqual(1);

    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.status).toBe('EXPIRED');
    const variant = await prisma.variant.findUniqueOrThrow({ where: { id: fixture.variantId } });
    expect(variant.stock).toBe(4);
  });

  it('ignores an unknown session instead of inventing an order', async () => {
    const result = await markOrderPaid({
      provider: 'DEMO',
      externalId: `evt_${randomUUID()}`,
      providerSessionId: 'demo_nonsense',
      orderReference: 'ZZ999999',
      raw: {},
    });
    expect(result).toEqual({ ok: false, reason: 'UNKNOWN_ORDER' });
  });
});
