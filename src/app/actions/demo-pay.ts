'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { demoGateway } from '@/lib/payments/demo';
import { cancelOrder, markOrderPaid } from '@/lib/fulfillment';

/**
 * The demo page's "pay" button posts here, and this calls the same idempotent
 * fulfilment path a signed gateway webhook uses. The redirect to the order page
 * is cosmetic — the status is already committed by the time it happens.
 */
export async function confirmDemoPayment(rawReference: unknown, outcome: 'paid' | 'failed'): Promise<void> {
  if (!demoGateway.isConfigured()) redirect('/');
  const reference = z.string().min(4).max(12).safeParse(String(rawReference ?? ''));
  if (!reference.success) redirect('/');

  if (outcome === 'paid') {
    await markOrderPaid({
      provider: 'DEMO',
      externalId: `demo_${reference.data}_paid`,
      orderReference: reference.data,
      raw: { source: 'demo_page', outcome },
    });
  } else {
    const order = await prisma.order.findUnique({ where: { reference: reference.data }, select: { id: true } });
    if (order) {
      await cancelOrder({ orderId: order.id, actor: 'demo_page', status: 'CANCELLED', note: 'Simulated failure' });
    }
  }

  revalidatePath(`/order/${reference.data}`);
  redirect(`/order/${reference.data}`);
}
