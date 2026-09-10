'use client'

import { useCartStore } from '@/store/cart-store'

export function useCart() {
  const store = useCartStore()

  const itemCount = store.items.reduce((acc, item) => acc + item.quantity, 0)
  const subtotal = store.items.reduce((acc, item) => acc + item.price * item.quantity, 0)
  const isEmpty = store.items.length === 0

  return {
    ...store,
    itemCount,
    subtotal,
    isEmpty,
  }
}
