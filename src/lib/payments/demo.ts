import { randomUUID } from 'node:crypto';
import type { CheckoutContext, CreatedCheckout, ParsedPaymentWebhook, PaymentGateway } from './types';

/**
 * Lets the whole purchase flow be exercised (demo deployments, CI, the
 * concurrency tests) without gateway credentials. It is only ever selectable
 * when PAYMENT_PROVIDERS explicitly lists DEMO, and it marks orders paid from a
 * server-side callback — never from the browser redirect.
 */
export const demoGateway: PaymentGateway = {
  provider: 'DEMO',

  isConfigured: () => process.env.DEMO_PAYMENTS === 'true',

  async createCheckout({ order }: CheckoutContext): Promise<CreatedCheckout> {
    const token = randomUUID();
    return {
      providerSessionId: `demo_${order.reference}_${token}`,
      redirectTo: `/demo-pay/${token}?reference=${order.reference}`,
    };
  },

  async parseWebhook({ rawBody }): Promise<ParsedPaymentWebhook> {
    const parsed = JSON.parse(rawBody) as { reference?: string; outcome?: string; id?: string };
    if (!parsed.reference) throw new Error('DEMO_WEBHOOK_MISSING_REFERENCE');
    const externalId = parsed.id ?? `demo_${parsed.reference}_${parsed.outcome ?? 'paid'}`;
    return parsed.outcome === 'failed'
      ? { kind: 'failed', orderReference: parsed.reference, externalId }
      : { kind: 'paid', orderReference: parsed.reference, externalId };
  },
};
