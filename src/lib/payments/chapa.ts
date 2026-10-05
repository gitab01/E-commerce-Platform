import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Order } from '@prisma/client';
import { toMajorAmount } from '../money';
import type { CheckoutContext, CreatedCheckout, ParsedPaymentWebhook, PaymentGateway } from './types';

/**
 * Chapa (Ethiopian rails: telebirr, CBE Birr, locally issued cards).
 *
 * Chapa documents two checkout generations whose payloads differ: v1 returns the
 * redirect target as a bare string in `data`, v3 returns `data.checkout_url`, and
 * the verify path moves with them. The base URL is therefore configuration, and
 * both payload shapes are accepted, so switching versions is an env change rather
 * than a code change.
 */
const DEFAULT_BASE_URL = 'https://api.chapa.co/v1';

const baseUrl = () => process.env.CHAPA_BASE_URL ?? DEFAULT_BASE_URL;
const secretKey = () => process.env.CHAPA_SECRET_KEY ?? '';
const isLegacyV1 = () => /\/v1\/?$/.test(baseUrl());

type ChapaInitResponse = {
  status?: boolean;
  message?: string;
  data?:
    | string
    | { checkout_url?: string; payment_status?: string; tx_ref?: string; reference?: string };
};

type ChapaVerifyResponse = {
  status?: boolean;
  data?: { status?: string; payment_status?: string; amount?: number | string; reference?: string; tx_ref?: string };
  message?: string;
};

function checkoutUrlFrom(payload: ChapaInitResponse | null): string | null {
  if (!payload?.status) return null;
  if (typeof payload.data === 'string') return payload.data;
  return payload.data?.checkout_url ?? null;
}

function initializeUrl(): string {
  return `${baseUrl()}/${isLegacyV1() ? 'transaction/initialize' : 'checkout'}`;
}

function verifyUrl(txRef: string): string {
  const path = isLegacyV1() ? `transaction/verify/${encodeURIComponent(txRef)}` : `checkout/verify/${encodeURIComponent(txRef)}`;
  return `${baseUrl()}/${path}`;
}

export const chapaGateway: PaymentGateway = {
  provider: 'CHAPA',

  isConfigured: () => secretKey().length > 0,

  async createCheckout({ order, lines }: CheckoutContext): Promise<CreatedCheckout> {
    const [firstName = 'Customer', ...rest] = (order.fullName ?? '').split(' ');
    const lastName = rest.join(' ') || firstName;

    const response = await fetch(initializeUrl(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey()}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email: order.email,
        first_name: firstName,
        last_name: lastName,
        phone_number: order.phone ?? undefined,
        // Chapa takes ETB major units with two decimals.
        amount: toMajorAmount(order.totalCents),
        currency: order.currency || 'ETB',
        // tx_ref is ours, generated before any network call, so a webhook can
        // always be matched to a committed order row.
        tx_ref: order.reference,
        callback_url: `${process.env.APP_URL}/api/webhooks/chapa`,
        return_url: `${process.env.APP_URL}/order/${order.reference}?paid=1`,
        customization: {
          title: 'E-commerce Platform',
          description: `Order ${order.reference} — ${lines.length} line item${lines.length === 1 ? '' : 's'}`,
        },
        meta: { order_reference: order.reference, hide_receipt: false },
      }),
    });

    const payload = (await response.json().catch(() => null)) as ChapaInitResponse | null;
    const checkoutUrl = checkoutUrlFrom(payload);
    if (!response.ok || !checkoutUrl) {
      throw new Error(`CHAPA_INIT_FAILED:${payload?.message ?? response.status}`);
    }
    return { providerSessionId: order.reference, redirectTo: checkoutUrl };
  },

  async parseWebhook({ rawBody, headers }): Promise<ParsedPaymentWebhook> {
    const signature = headers['x-chapa-signature'];
    const hashKey = process.env.CHAPA_WEBHOOK_HASH_PUBLIC_KEY;
    if (!signature || !hashKey) throw new Error('CHAPA_WEBHOOK_UNSIGNABLE');
    if (!verifySignature(rawBody, signature, hashKey)) throw new Error('CHAPA_BAD_SIGNATURE');

    const event = JSON.parse(rawBody) as {
      event?: string;
      data?: {
        event?: string;
        data?: { tx_ref?: string; status?: string; reference?: string };
        tx_ref?: string;
        status?: string;
        reference?: string;
      };
    };
    // The settled transaction is nested one level deeper than the envelope.
    const transaction = event.data?.data ?? event.data;
    if (event.event !== 'verified.transaction' || !transaction?.tx_ref) {
      throw new Error('CHAPA_WEBHOOK_NO_REFERENCE');
    }
    const externalId = `${transaction.reference ?? transaction.tx_ref}:${event.event}`;
    const settled = transaction.status === 'success' || transaction.status === 'paid';
    return settled
      ? { kind: 'paid', orderReference: transaction.tx_ref, externalId }
      : { kind: 'failed', orderReference: transaction.tx_ref, externalId };
  },

  async verify(order: Order): Promise<'paid' | 'pending' | 'failed'> {
    const txRef = order.providerSessionId ?? order.reference;
    const response = await fetch(verifyUrl(txRef), {
      headers: { Authorization: `Bearer ${secretKey()}`, Accept: 'application/json' },
    });
    // An unreachable gateway must never expire a possibly-paid order.
    if (!response.ok) return 'pending';
    const payload = (await response.json().catch(() => null)) as ChapaVerifyResponse | null;
    const status = payload?.data?.status ?? payload?.data?.payment_status;
    if (status === 'success' || status === 'paid') return 'paid';
    if (status === 'fail' || status === 'failed' || status === 'cancelled') return 'failed';
    return 'pending';
  },
};

/**
 * Chapa signs the raw body with HMAC-SHA256 keyed by the webhook hash public key
 * and sends it base64-encoded in `X-Chapa-Signature`. Compared in constant time;
 * an unverifiable payload fails closed.
 */
export function verifySignature(rawBody: string, signature: string, hashKey: string): boolean {
  const expected = createHmac('sha256', hashKey).update(rawBody, 'utf8').digest('base64');
  const received = Buffer.from(signature, 'utf8');
  const computed = Buffer.from(expected, 'utf8');
  return received.length === computed.length && timingSafeEqual(received, computed);
}
