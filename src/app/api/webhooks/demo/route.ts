import { NextResponse } from 'next/server';
import { demoGateway } from '@/lib/payments/demo';
import { markOrderPaid } from '@/lib/fulfillment';

export const runtime = 'nodejs';

/**
 * Stands in for a gateway webhook when DEMO_PAYMENTS=true, so the demo page
 * still routes confirmation through the server. Order state is never set by the
 * browser redirect even in demo mode.
 */
export async function POST(request: Request) {
  if (!demoGateway.isConfigured()) {
    return NextResponse.json({ error: 'demo payments disabled' }, { status: 404 });
  }
  const rawBody = await request.text();
  const event = await demoGateway.parseWebhook({ rawBody, headers: {} });
  if (event.kind !== 'paid') {
    return NextResponse.json({ received: true, ignored: true });
  }
  const result = await markOrderPaid({
    provider: 'DEMO',
    externalId: event.externalId,
    orderReference: event.orderReference,
    raw: JSON.parse(rawBody),
  });
  return NextResponse.json({ received: true, applied: result.ok });
}
