import type { Order, PaymentProvider } from '@prisma/client';

export type CheckoutContext = {
  order: Order;
  lines: { sku: string; title: string; quantity: number; unitPriceCents: number }[];
};

export type CreatedCheckout = {
  /** Gateway-side identifier we can later match webhook events against. */
  providerSessionId: string;
  /** URL the browser is sent to in order to pay. */
  redirectTo: string;
};

export type ParsedPaymentWebhook =
  | { kind: 'paid'; providerSessionId?: string; orderReference?: string; externalId: string }
  | { kind: 'failed'; providerSessionId?: string; orderReference?: string; externalId: string }
  | { kind: 'ignored'; externalId: string };

export interface PaymentGateway {
  readonly provider: PaymentProvider;
  /** False when credentials are absent, so the provider is not offered to users. */
  isConfigured(): boolean;
  createCheckout(context: CheckoutContext): Promise<CreatedCheckout>;
  /**
   * Verify the signature over the raw request body and translate the event into
   * a payment outcome. Must throw rather than trust an unverifiable payload.
   */
  parseWebhook(input: { rawBody: string; headers: Record<string, string | undefined> }): Promise<ParsedPaymentWebhook>;
  /** Optional server-side re-check used by the reconciliation job. */
  verify?(order: Order): Promise<'paid' | 'pending' | 'failed'>;
}
