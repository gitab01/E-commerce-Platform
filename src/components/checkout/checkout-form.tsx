'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PaymentMethods, type PaymentMethodId } from './payment-methods'
import { useCart } from '@/hooks/use-cart'
import type { ShippingAddress } from '@/types'

const ETHIOPIAN_CITIES = [
  'Addis Ababa', 'Dire Dawa', 'Mekelle', 'Bahir Dar', 'Adama',
  'Gondar', 'Hawassa', 'Jimma', 'Dessie', 'Jijiga', 'Shashemene',
  'Bishoftu', 'Sodo', 'Arba Minch', 'Harar', 'Dilla',
]

export function CheckoutForm() {
  const router = useRouter()
  const { items, subtotal, clearCart } = useCart()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethodId | null>('chapa_telebirr')

  const [address, setAddress] = useState<ShippingAddress>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    street: '',
    city: 'Addis Ababa',
    state: 'Addis Ababa',
    country: 'Ethiopia',
    postalCode: '',
  })

  const [errors, setErrors] = useState<Partial<ShippingAddress>>({})

  const validate = (): boolean => {
    const newErrors: Partial<ShippingAddress> = {}
    if (!address.firstName) newErrors.firstName = 'Required'
    if (!address.lastName) newErrors.lastName = 'Required'
    if (!address.email || !/\S+@\S+\.\S+/.test(address.email)) newErrors.email = 'Valid email required'
    if (!address.phone) newErrors.phone = 'Required'
    if (!address.street) newErrors.street = 'Required'
    if (!address.city) newErrors.city = 'Required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    if (!selectedPayment) {
      setError('Please select a payment method')
      return
    }
    if (items.length === 0) {
      setError('Your cart is empty')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          shippingAddress: address,
          paymentMethod: selectedPayment,
        }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Order failed')

      // Redirect to payment gateway
      if (data.checkoutUrl) {
        clearCart()
        window.location.href = data.checkoutUrl
      } else if (data.orderId) {
        clearCart()
        router.push(`/checkout/success?orderId=${data.orderId}`)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Shipping Info */}
      <div className="space-y-4">
        <h2 className="font-semibold text-base">Shipping Information</h2>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First Name"
            value={address.firstName}
            onChange={(e) => setAddress({ ...address, firstName: e.target.value })}
            error={errors.firstName}
            required
          />
          <Input
            label="Last Name"
            value={address.lastName}
            onChange={(e) => setAddress({ ...address, lastName: e.target.value })}
            error={errors.lastName}
            required
          />
          <div className="col-span-2">
            <Input
              label="Email"
              type="email"
              value={address.email}
              onChange={(e) => setAddress({ ...address, email: e.target.value })}
              error={errors.email}
              required
            />
          </div>
          <div className="col-span-2">
            <Input
              label="Phone Number"
              type="tel"
              placeholder="+251 9XX XXX XXX"
              value={address.phone}
              onChange={(e) => setAddress({ ...address, phone: e.target.value })}
              error={errors.phone}
              required
            />
          </div>
          <div className="col-span-2">
            <Input
              label="Street Address"
              placeholder="Bole Road, Near Atlas Hotel..."
              value={address.street}
              onChange={(e) => setAddress({ ...address, street: e.target.value })}
              error={errors.street}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              City <span className="text-destructive">*</span>
            </label>
            <select
              value={address.city}
              onChange={(e) => setAddress({ ...address, city: e.target.value })}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {ETHIOPIAN_CITIES.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
          <Input
            label="Postal Code"
            value={address.postalCode || ''}
            onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
            placeholder="Optional"
          />
        </div>
      </div>

      {/* Payment */}
      <PaymentMethods selected={selectedPayment} onSelect={setSelectedPayment} />

      <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!selectedPayment}>
        {loading ? 'Processing...' : `Pay ${new Intl.NumberFormat('en-ET').format(subtotal * 1.15)} ETB`}
      </Button>
    </form>
  )
}
