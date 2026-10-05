import { describe, expect, it } from 'vitest';
import { STATUS_LABELS, canTransition } from '@/lib/order-state';
import type { OrderStatus } from '@prisma/client';

const ALL = Object.keys(STATUS_LABELS) as OrderStatus[];

describe('order state machine', () => {
  it('allows only the documented forward moves', () => {
    expect(canTransition('PENDING', 'PAID')).toBe(true);
    expect(canTransition('PENDING', 'CANCELLED')).toBe(true);
    expect(canTransition('PENDING', 'EXPIRED')).toBe(true);
    expect(canTransition('PAID', 'SHIPPED')).toBe(true);
    expect(canTransition('PAID', 'CANCELLED')).toBe(true);
    expect(canTransition('SHIPPED', 'DELIVERED')).toBe(true);
  });

  it('rejects every backwards or skipping move', () => {
    expect(canTransition('PENDING', 'SHIPPED')).toBe(false);
    expect(canTransition('PENDING', 'DELIVERED')).toBe(false);
    expect(canTransition('PAID', 'PENDING')).toBe(false);
    expect(canTransition('SHIPPED', 'PAID')).toBe(false);
    expect(canTransition('SHIPPED', 'CANCELLED')).toBe(false);
    expect(canTransition('PAID', 'DELIVERED')).toBe(false);
  });

  it('treats cancelled, expired and delivered as terminal', () => {
    for (const terminal of ['CANCELLED', 'EXPIRED', 'DELIVERED'] as OrderStatus[]) {
      for (const target of ALL) {
        expect(canTransition(terminal, target)).toBe(false);
      }
    }
  });

  it('never allows an unpaid order to be marked paid from itself', () => {
    expect(canTransition('PENDING', 'PENDING')).toBe(false);
    expect(canTransition('PAID', 'PAID')).toBe(false);
  });
});
