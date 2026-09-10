'use client'

import Link from 'next/link'
import { X, ShoppingCart } from 'lucide-react'
import { CartItem } from './cart-item'
import { useCart } from '@/hooks/use-cart'
import { formatPrice } from '@/lib/utils'

export function CartDrawer() {
  const { items, isOpen, closeCart, isEmpty, subtotal } = useCart()

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-background shadow-xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            <h2 className="font-semibold">Cart ({items.length})</h2>
          </div>
          <button
            onClick={closeCart}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors"
            aria-label="Close cart"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <div className="text-5xl mb-4">🛒</div>
              <h3 className="font-semibold mb-1">Your cart is empty</h3>
              <p className="text-sm text-muted-foreground mb-4">Add some products to get started</p>
              <Link
                href="/products"
                onClick={closeCart}
                className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent transition-colors"
              >
                Browse Products
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((item) => (
                <CartItem key={item.productId} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isEmpty && (
          <div className="border-t border-border p-6 space-y-4">
            <div className="flex justify-between text-sm font-semibold">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Shipping and taxes calculated at checkout</p>
            <Link
              href="/checkout"
              onClick={closeCart}
              className="w-full h-12 rounded-lg bg-primary text-primary-foreground text-base font-medium hover:bg-primary/90 transition-colors inline-flex items-center justify-center"
            >
              Checkout
            </Link>
            <Link
              href="/cart"
              onClick={closeCart}
              className="w-full h-8 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors inline-flex items-center justify-center"
            >
              View Cart
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
