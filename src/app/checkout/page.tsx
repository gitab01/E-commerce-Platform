import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { CheckoutForm } from '@/components/checkout/checkout-form'
import { CartSummary } from '@/components/cart/cart-summary'

export const metadata: Metadata = { title: 'Checkout' }

export default async function CheckoutPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login?callbackUrl=/checkout')
  }

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CheckoutForm />
        </div>
        <div>
          <CartSummary showCheckout={false} />
        </div>
      </div>
    </div>
  )
}
