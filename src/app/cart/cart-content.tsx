'use client'

import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { CartItem } from '@/components/cart/cart-item'
import { CartSummary } from '@/components/cart/cart-summary'
import { useCart } from '@/hooks/use-cart'

export function CartPageContent() {
  const { items, isEmpty, clearCart } = useCart()

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-7xl mb-6">🛒</div>
        <h2 className="text-xl font-bold mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground mb-6">Looks like you haven&apos;t added anything yet.</p>
        <Link
          href="/products"
          className="h-12 rounded-lg bg-primary text-primary-foreground px-6 text-base font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
        >
          <ShoppingBag className="h-4 w-4" /> Browse Products
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="rounded-xl border border-border bg-card divide-y divide-border px-6">
          {items.map((item) => (
            <CartItem key={item.productId} item={item} />
          ))}
        </div>
        <div className="mt-3 flex justify-end">
          <button
            onClick={clearCart}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            Clear cart
          </button>
        </div>
      </div>
      <div>
        <CartSummary />
      </div>
    </div>
  )
}
