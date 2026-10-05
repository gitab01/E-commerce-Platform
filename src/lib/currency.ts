/**
 * The ledger is a single integer currency (BASE_CURRENCY minor units). A gateway
 * that presents a different currency is converted once, at its own boundary, and
 * the ledger is never rewritten. If no rate is configured the call fails loudly
 * instead of silently charging the wrong figure.
 */
export class CurrencyMismatch extends Error {
  constructor(readonly from: string, readonly to: string) {
    super(`No exchange rate configured to present ${from} amounts as ${to}. Set ETB_PER_USD.`);
    this.name = 'CurrencyMismatch';
  }
}

export function exchangeRate(from: string, to: string): number {
  const base = from.toUpperCase();
  const target = to.toUpperCase();
  if (base === target) return 1;
  const perUsd = Number.parseFloat(process.env.ETB_PER_USD ?? '');
  if (!Number.isFinite(perUsd) || perUsd <= 0) throw new CurrencyMismatch(base, target);
  if (base === 'ETB' && target === 'USD') return 1 / perUsd;
  if (base === 'USD' && target === 'ETB') return perUsd;
  throw new CurrencyMismatch(base, target);
}

export function convertMinorUnits(cents: number, from: string, to: string): number {
  if (!Number.isInteger(cents)) throw new TypeError('Money must be integer minor units');
  return Math.round(cents * exchangeRate(from, to));
}
