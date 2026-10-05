import { createHmac } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { chapaGateway, verifySignature } from '@/lib/payments/chapa';
import { stripeGateway } from '@/lib/payments/stripe';

const HASH_KEY = 'test-webhook-hash-key';

describe('gateway webhook signatures', () => {
  beforeAll(() => {
    process.env.CHAPA_WEBHOOK_HASH_PUBLIC_KEY = HASH_KEY;
  });

  it('accepts a body signed with the webhook hash key', () => {
    const body = JSON.stringify({
      event: 'verified.transaction',
      data: { event: 'confirmed', data: { tx_ref: 'AB12CD34', status: 'success' } },
    });
    const signature = createHmac('sha256', HASH_KEY).update(body, 'utf8').digest('base64');
    expect(verifySignature(body, signature, HASH_KEY)).toBe(true);
  });

  it('rejects a body altered after signing', () => {
    const body = '{"a":1}';
    const signature = createHmac('sha256', HASH_KEY).update(body, 'utf8').digest('base64');
    expect(verifySignature('{"a":2}', signature, HASH_KEY)).toBe(false);
  });

  it('rejects a signature made with the wrong key', () => {
    const body = '{"a":1}';
    const signature = createHmac('sha256', 'not-the-key').update(body, 'utf8').digest('base64');
    expect(verifySignature(body, signature, HASH_KEY)).toBe(false);
  });

  it('parses a settled Chapa transaction into a paid outcome keyed by tx_ref', async () => {
    const body = JSON.stringify({
      event: 'verified.transaction',
      data: { event: 'confirmed', data: { tx_ref: 'AB12CD34', status: 'success', reference: 'chapa_9001' } },
    });
    const signature = createHmac('sha256', HASH_KEY).update(body, 'utf8').digest('base64');

    const parsed = await chapaGateway.parseWebhook({
      rawBody: body,
      headers: { 'x-chapa-signature': signature },
    });
    expect(parsed).toMatchObject({ kind: 'paid', orderReference: 'AB12CD34' });
  });

  it('fails closed when the signature header is missing', async () => {
    await expect(
      chapaGateway.parseWebhook({ rawBody: '{}', headers: {} }),
    ).rejects.toThrow('CHAPA_WEBHOOK_UNSIGNABLE');
  });

  it('fails closed for Stripe without a signature header', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    await expect(stripeGateway.parseWebhook({ rawBody: '{}', headers: {} })).rejects.toThrow(
      'STRIPE_WEBHOOK_UNSIGNABLE',
    );
  });
});
