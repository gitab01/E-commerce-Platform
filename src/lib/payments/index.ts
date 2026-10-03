import type { PaymentProvider } from '@prisma/client';
import { stripeGateway } from './stripe';
import { chapaGateway } from './chapa';
import { demoGateway } from './demo';
import type { PaymentGateway } from './types';

const registry: Record<PaymentProvider, PaymentGateway> = {
  STRIPE: stripeGateway,
  CHAPA: chapaGateway,
  DEMO: demoGateway,
};

export function getGateway(provider: PaymentProvider): PaymentGateway {
  const gateway = registry[provider];
  if (!gateway) throw new Error(`UNKNOWN_PROVIDER:${provider}`);
  return gateway;
}

/** Providers whose credentials are present, in the order users see them. */
export function availableProviders(): PaymentProvider[] {
  const enabled = (process.env.PAYMENT_PROVIDERS ?? 'CHAPA,STRIPE')
    .split(',')
    .map((token) => token.trim().toUpperCase())
    .filter((token): token is PaymentProvider =>
      ['CHAPA', 'STRIPE', 'DEMO'].includes(token),
    );
  return enabled.filter((provider) => {
    if (provider === 'DEMO' && process.env.DEMO_PAYMENTS !== 'true') return false;
    return getGateway(provider).isConfigured();
  });
}

export function isProviderSelectable(provider: PaymentProvider): boolean {
  return availableProviders().includes(provider);
}
