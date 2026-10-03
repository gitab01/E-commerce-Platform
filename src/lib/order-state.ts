import type { OrderStatus } from '@prisma/client';

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAID', 'CANCELLED', 'EXPIRED'],
  PAID: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  EXPIRED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new IllegalTransition(from, to);
  }
}

export class IllegalTransition extends Error {
  constructor(readonly from: OrderStatus, readonly to: OrderStatus) {
    super(`Illegal order transition: ${from} -> ${to}`);
    this.name = 'IllegalTransition';
  }
}

export const TERMINAL_STATUSES: OrderStatus[] = ['DELIVERED', 'CANCELLED', 'EXPIRED'];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Awaiting payment',
  PAID: 'Paid',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Payment window expired',
};
