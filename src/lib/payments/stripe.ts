import Stripe from 'stripe';
import { toMajorAmount } from '../money';
import type { CheckoutContext, CreatedCheckout, ParsedPaymentWebhook, PaymentGateway } from './types';

let cached: Stripe | null = null;

function client(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_NOT_CONFIGURED');
  cached ??= new Stripe(key, { typescript: true, appInfo: { name: 'storefront-checkout' } });
  return cached;
}

export const stripeGateway: PaymentGateway = {
  provider: 'STRIPE',

  isConfigured: () => Boolean(process.env.STRIPE_SECRET_KEY),

  async createCheckout({ order, lines }: CheckoutContext): Promise<CreatedCheckout> {
    const currency = (process.env.STRIPE_CURRENCY ?? 'usd').toLowerCase();
    const session = await client().checkout.sessions.create({
      mode: 'payment',
      currency,
      // client_reference_id lets the webhook find the order even if this
      // response is lost before we can persist the session id.
      client_reference_id: order.reference,
      metadata: { orderReference: order.reference, orderId: order.id },
      customer_email: order.email,
      line_items: lines.map((line) => ({
        quantity: line.quantity,
        price_data: {
          currency,
          unit_amount: line.unitPriceCents,
          product_data: { name: `${line.title} — ${line.sku}` },
        },
      })),
      // Shipping is a real line item so the gateway total equals our total.
      ...(order.shippingCents > 0
        ? {
            shipping_amount: {
              currency,
              amount: order.shippingCents,
              display_name: 'Delivery',
            },
          }
        : {}),
      success_url: `${process.env.APP_URL}/order/${order.reference}?paid=1`,
      cancel_url: `${process.env.APP_URL}/order/${order.reference}?cancelled=1`,
    });
    if (!session.url || !session.id) throw new Error('STRIPE_SESSION_INCOMPLETE');
    return { providerSessionId: session.id, redirectTo: session.url };
  },

  async parseWebhook({
    rawBody,
    headers,
  }): Promise<ParsedPaymentWebhook> {
    const signature = headers['stripe-signature'];
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!signature || !secret) throw new Error('STRIPE_WEBHOOK_UNSIGNABLE');
    const event = client().webhooks.constructEvent(rawBody, signature, secret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        kind: 'paid',
        providerSessionId: session.id,
        orderReference:
          (session.client_reference_id as string | null) ??
          (session.metadata?.orderReference ?? undefined),
        externalId: event.id,
      };
    }
    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      return { kind: 'failed', providerSessionId: session.id, externalId: event.id };
    }
    return { kind: 'ignored', externalId: event.id };
  },

  async verify(order) {
    if (!order.providerSessionId) return 'pending';
    const session = await client().checkout.sessions.retrieve(order.providerSessionId);
    if (session.payment_status === 'paid') return 'paid';
    if (session.status === 'expired') return 'failed';
    return 'pending';
  },
};

/** Chapa amounts are major units with two decimals; kept here for reference. */
export function majorFromCents(cents: number): string {
  return toMajorAmount(cents);
}
