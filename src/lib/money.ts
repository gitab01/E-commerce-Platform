/**
 * All money in this system is an integer count of minor units (santim) of the
 * base currency. Conversion to a display string happens only here.
 */
export const BASE_CURRENCY = (process.env.BASE_CURRENCY ?? 'ETB').toUpperCase();

const SYMBOLS: Record<string, string> = {
  ETB: 'Br',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export function formatMoney(cents: number, currency: string = BASE_CURRENCY): string {
  if (!Number.isInteger(cents)) {
    throw new TypeError(`formatMoney expects integer minor units, received ${cents}`);
  }
  const symbol = SYMBOLS[currency];
  const major = (cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return symbol ? `${symbol}${major}` : `${major} ${currency}`;
}

/** Whole-unit amount for gateways that take major units with 2 decimals (Chapa). */
export function toMajorAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function addShipping(subtotalCents: number): number {
  return subtotalCents >= 300_000 ? 0 : SHIPPING_FLAT_CENTS;
}

export const SHIPPING_FLAT_CENTS = 2_500;
