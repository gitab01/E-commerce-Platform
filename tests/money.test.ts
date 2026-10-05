import { describe, expect, it } from 'vitest';
import { addShipping, formatMoney, toMajorAmount } from '@/lib/money';
import { CurrencyMismatch, convertMinorUnits } from '@/lib/currency';

describe('money', () => {
  it('refuses to render a fractional cent', () => {
    expect(() => formatMoney(1000.5)).toThrow(TypeError);
  });

  it('formats integer minor units as whole currency', () => {
    expect(formatMoney(120_000, 'ETB')).toBe('Br1,200.00');
    expect(formatMoney(99, 'USD')).toBe('$0.99');
  });

  it('emits gateway decimal strings with two places', () => {
    expect(toMajorAmount(120_000)).toBe('1200.00');
    expect(toMajorAmount(1)).toBe('0.01');
    expect(toMajorAmount(0)).toBe('0.00');
  });

  it('is free over the threshold and flat below it', () => {
    expect(addShipping(299_999)).toBe(2_500);
    expect(addShipping(300_000)).toBe(0);
  });
});

describe('gateway-boundary conversion', () => {
  it('leaves amounts untouched when the currency already matches', () => {
    expect(convertMinorUnits(120_000, 'ETB', 'ETB')).toBe(120_000);
  });

  it('rounds once when presenting ETB as USD', () => {
    process.env.ETB_PER_USD = '129.5';
    expect(convertMinorUnits(129_500, 'ETB', 'USD')).toBe(1_000);
    expect(convertMinorUnits(1_180_000, 'ETB', 'USD')).toBe(9_112);
    expect(() => convertMinorUnits(1.5, 'ETB', 'USD')).toThrow(TypeError);
    delete process.env.ETB_PER_USD;
  });

  it('refuses to guess a rate', () => {
    delete process.env.ETB_PER_USD;
    expect(() => convertMinorUnits(120_000, 'ETB', 'USD')).toThrow(CurrencyMismatch);
  });
});
