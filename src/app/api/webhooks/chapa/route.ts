import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { chapaGateway } from '@/lib/payments/chapa';
import { markOrderPaid } from '@/lib/fulfillment';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const allHeaders = await headers();
  const headerRecord: Record<string, string | undefined> = {
    'x-chapa-signature': allHeaders.get('x-chapa-signature') ?? undefined,
  };

  let event;
  try {
    event = await chapaGateway.parseWebhook({ rawBody, headers: headerRecord });
  } catch (error) {
    console.error('chapa webhook rejected', error);
    return NextResponse.json({ message: 'invalid signature' }, { status: 400 });
  }

  if (event.kind === 'ignored') {
    return NextResponse.json({ received: true, ignored: event.externalId });
  }

  const result = await markOrderPaid({
    provider: 'CHAPA',
    externalId: event.externalId,
    // Chapa's tx_ref is our order reference, generated before the session
    // exists, so a webhook can always resolve to a row.
    orderReference: event.orderReference ?? event.providerSessionId,
    raw: JSON.parse(rawBody),
  });

  if (!result.ok && result.reason === 'UNKNOWN_ORDER') {
    return NextResponse.json({ message: 'order not found, retry' }, { status: 500 });
  }

  return NextResponse.json({ received: true, applied: result.ok ? result.applied : false });
}
