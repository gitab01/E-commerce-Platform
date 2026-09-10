import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CartPageContent } from './cart-content'

export const metadata: Metadata = { title: 'Cart' }

export default function CartPage() {
  return (
    <div className="container py-8">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/products" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Continue Shopping
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-6">Shopping Cart</h1>
      <CartPageContent />
    </div>
  )
}
