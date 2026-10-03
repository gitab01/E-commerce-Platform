import { Prisma, type Order, type OrderStatus, type PaymentProvider } from '@prisma/client';
import { prisma } from './db';
import { assertTransition, IllegalTransition } from './order-state';
import { getGateway } from './payments';

export type FulfilResult =
  | { ok: true; orderId: string; applied: boolean }
  | { ok: false; reason: 'UNKNOWN_ORDER' | 'ALREADY_TERMINAL' | 'GATEWAY_NOT_PAID' };

/**
 * Moves an order to PAID. Safe to call twice for the same gateway event: the
 * (provider, externalId) unique key is inserted in the same transaction as the
 * status change, so a retried delivery either applies once or applies not at all.
 */
export async function markOrderPaid(args: {
  provider: PaymentProvider;
  externalId: string;
  providerSessionId?: string;
  orderReference?: string;
  raw: unknown;
}): Promise<FulfilResult> {
  const order = await resolveOrder({
    provider: args.provider,
    providerSessionId: args.providerSessionId,
    orderReference: args.orderReference,
  });
  if (!order) return { ok: false, reason: 'UNKNOWN_ORDER' };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.paymentEvent.create({
        data: {
          provider: args.provider,
          externalId: args.externalId,
          type: 'paid',
          orderId: order.id,
          payload: (args.raw ?? {}) as Prisma.InputJsonValue,
        },
      });
      assertTransition(order.status, 'PAID');
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          providerSessionId: args.providerSessionId ?? order.providerSessionId,
        },
      });
      await tx.orderEvent.create({
        data: { orderId: order.id, from: order.status, to: 'PAID', actor: `webhook:${args.provider.toLowerCase()}` },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { ok: true, orderId: order.id, applied: false };
    }
    if (error instanceof IllegalTransition) {
      await recordRejectedTransition(order.id, order.status, 'PAID', `webhook:${args.provider.toLowerCase()}`, error.message);
      return { ok: true, orderId: order.id, applied: false };
    }
    throw error;
  }

  return { ok: true, orderId: order.id, applied: true };
}

async function resolveOrder(args: {
  provider: PaymentProvider;
  providerSessionId?: string;
  orderReference?: string;
}): Promise<Order | null> {
  if (args.providerSessionId) {
    const bySession = await prisma.order.findUnique({
      where: { providerSessionId: args.providerSessionId },
    });
    if (bySession) return bySession;
  }
  if (args.orderReference) {
    return prisma.order.findUnique({ where: { reference: args.orderReference } });
  }
  return null;
}

async function recordRejectedTransition(
  orderId: string,
  from: OrderStatus,
  to: OrderStatus,
  actor: string,
  note: string,
) {
  await prisma.orderEvent
    .create({ data: { orderId, from, to, actor, note: `rejected: ${note}` } })
    .catch(() => undefined);
}

export async function cancelOrder(args: {
  orderId: string;
  actor: string;
  status: 'CANCELLED' | 'EXPIRED';
  note?: string;
}): Promise<{ restocked: boolean }> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: args.orderId },
      include: { items: true },
    });
    assertTransition(order.status, args.status);
    await tx.order.update({
      where: { id: order.id },
      data: { status: args.status, cancelledAt: args.status === 'CANCELLED' ? new Date() : order.cancelledAt },
    });
    await tx.orderEvent.create({
      data: { orderId: order.id, from: order.status, to: args.status, actor: args.actor, note: args.note },
    });
    for (const item of order.items) {
      await tx.variant.update({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
      });
    }
    return { restocked: true };
  });
}

export async function advanceOrder(args: {
  orderId: string;
  to: OrderStatus;
  actor: string;
  note?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({ where: { id: args.orderId } });
      assertTransition(order.status, args.to);
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: args.to,
          shippedAt: args.to === 'SHIPPED' ? new Date() : undefined,
          deliveredAt: args.to === 'DELIVERED' ? new Date() : undefined,
        },
      });
      await tx.orderEvent.create({
        data: { orderId: order.id, from: order.status, to: args.to, actor: args.actor, note: args.note },
      });
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof IllegalTransition) {
      await recordRejectedTransition(args.orderId, error.from, error.to, args.actor, error.message);
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

export type ReconcileReport = {
  expired: number;
  rescuedToPaid: number;
  checked: number;
  errors: string[];
};

/**
 * Abandoned checkouts must not hold inventory hostage. Every stale PENDING
 * order is asked of the gateway first: if payment actually landed but the
 * webhook never did, the order is rescued to PAID instead of expiring.
 */
export async function reconcileStaleReservations(now = new Date()): Promise<ReconcileReport> {
  const stale = await prisma.order.findMany({
    where: { status: 'PENDING', expiresAt: { lt: now } },
    select: { id: true, reference: true },
  });
  const report: ReconcileReport = { expired: 0, rescuedToPaid: 0, checked: stale.length, errors: [] };

  for (const order of stale) {
    try {
      const full = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
      const gateway = getGateway(full.provider);
      const state = (await gateway.verify?.(full)) ?? 'pending';
      if (state === 'paid') {
        const result = await markOrderPaid({
          provider: full.provider,
          externalId: `reconcile_${full.reference}_${Date.now()}`,
          providerSessionId: full.providerSessionId ?? undefined,
          orderReference: full.reference,
          raw: { source: 'reconciliation' },
        });
        if (result.ok && result.applied) report.rescuedToPaid += 1;
        continue;
      }
      if (state === 'failed') {
        await cancelOrder({
          orderId: full.id,
          actor: 'reconciliation',
          status: 'EXPIRED',
          note: 'Gateway reported the payment did not complete',
        });
        report.expired += 1;
        continue;
      }
      await cancelOrder({
        orderId: full.id,
        actor: 'reconciliation',
        status: 'EXPIRED',
        note: 'Payment window elapsed',
      });
      report.expired += 1;
    } catch (error) {
      if (error instanceof IllegalTransition) continue;
      report.errors.push(`${order.reference}: ${(error as Error).message}`);
    }
  }
  return report;
}
