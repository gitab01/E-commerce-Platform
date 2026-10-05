import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripeGateway } from '@/lib/payments/stripe';
import { markOrderPaid } from '@/lib/fulfillment';

// The body must be read raw: signature verification is over the exact bytes.
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const allHeaders = await headers();
  const headerRecord: Record<string, string | undefined> = {};
  allHeaders.forEach((value, key) => {
    headerRecord[key] = value;
  });

  let event;
  try {
    event = await stripeGateway.parseWebhook({ rawBody, headers: headerRecord });
  } catch (error) {
    console.error('stripe webhook rejected', error);
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  if (event.kind === 'ignored') {
    return NextResponse.json({ received: true, ignored: event.externalId });
  }

  const result = await markOrderPaid({
    provider: 'STRIPE',
    externalId: event.externalId,
    providerSessionId: event.providerSessionId,
    orderReference: event.orderReference,
    raw: JSON.parse(rawBody),
  });

  if (!result.ok && result.reason === 'UNKNOWN_ORDER') {
    // 500 makes Stripe retry: the order row may not be committed yet.
    return NextResponse.json({ error: 'order not found, retry' }, { status: 500 });
  }

  return NextResponse.json({ received: true, applied: result.ok ? result.applied : false });
}
