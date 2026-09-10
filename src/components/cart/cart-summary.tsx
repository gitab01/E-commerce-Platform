'use client'

import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { useCart } from '@/hooks/use-cart'

const SHIPPING_THRESHOLD = 2000
const SHIPPING_COST = 150
const TAX_RATE = 0.15

interface CartSummaryProps {
  showCheckout?: boolean
}

export function CartSummary({ showCheckout = true }: CartSummaryProps) {
  const { subtotal, isEmpty } = useCart()

  const shippingCost = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
  const tax = subtotal * TAX_RATE
  const total = subtotal + shippingCost + tax

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <h3 className="font-semibold text-base">Order Summary</h3>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Shipping</span>
          {shippingCost === 0 ? (
            <span className="text-green-600 font-medium">Free</span>
          ) : (
            <span>{formatPrice(shippingCost)}</span>
          )}
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax (15%)</span>
          <span>{formatPrice(tax)}</span>
        </div>
        {subtotal > 0 && subtotal < SHIPPING_THRESHOLD && (
          <p className="text-xs text-muted-foreground rounded-lg bg-muted p-2">
            Add {formatPrice(SHIPPING_THRESHOLD - subtotal)} more for free shipping!
          </p>
        )}
        <div className="border-t border-border pt-2 flex justify-between font-semibold text-base">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
      </div>

      {showCheckout && (
        <div className="space-y-2">
          {isEmpty ? (
            <button
              disabled
              className="w-full h-12 rounded-lg bg-primary/50 text-primary-foreground text-base font-medium cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              <ShoppingBag className="h-4 w-4" />
              Proceed to Checkout
            </button>
          ) : (
            <Link
              href="/checkout"
              className="w-full h-12 rounded-lg bg-primary text-primary-foreground text-base font-medium hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2"
            >
              <ShoppingBag className="h-4 w-4" />
              Proceed to Checkout
            </Link>
          )}
          <Link
            href="/products"
            className="w-full h-8 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors inline-flex items-center justify-center gap-2"
          >
            Continue Shopping
          </Link>
        </div>
      )}
    </div>
  )
}
