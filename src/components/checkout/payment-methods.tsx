'use client'

import { useState } from 'react'
import Image from 'next/image'
import { CheckCircle, CreditCard, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'

export type PaymentMethodId =
  | 'chapa_telebirr' | 'chapa_cbe' | 'chapa_boa' | 'chapa_awash'
  | 'chapa_dashen' | 'chapa_abyssinia' | 'chapa_united' | 'chapa_oromia'
  | 'chapa_nib' | 'chapa_berhan' | 'chapa_bunna' | 'chapa_zemen' | 'chapa_enat'
  | 'arifpay' | 'stripe'

interface PaymentMethod {
  id: PaymentMethodId
  name: string
  description: string
  provider: 'chapa' | 'arifpay' | 'stripe'
  icon: string
  color: string
  popular?: boolean
  type: 'wallet' | 'bank' | 'card'
}

const PAYMENT_METHODS: PaymentMethod[] = [
  // Mobile Wallets
  {
    id: 'chapa_telebirr',
    name: 'Telebirr',
    description: 'Ethio Telecom mobile wallet',
    provider: 'chapa',
    icon: '📱',
    color: '#0066CC',
    popular: true,
    type: 'wallet',
  },
  {
    id: 'arifpay',
    name: 'ArifPay',
    description: 'All Ethiopian banks & wallets',
    provider: 'arifpay',
    icon: '💳',
    color: '#6C3CE1',
    popular: true,
    type: 'wallet',
  },
  // Banks via Chapa
  {
    id: 'chapa_cbe',
    name: 'CBE Birr',
    description: 'Commercial Bank of Ethiopia',
    provider: 'chapa',
    icon: '🏦',
    color: '#007A3D',
    type: 'bank',
  },
  {
    id: 'chapa_boa',
    name: 'Bank of Abyssinia',
    description: 'BOA mobile banking',
    provider: 'chapa',
    icon: '🏦',
    color: '#C8102E',
    type: 'bank',
  },
  {
    id: 'chapa_awash',
    name: 'Awash Bank',
    description: 'Awash Bank mobile banking',
    provider: 'chapa',
    icon: '🏦',
    color: '#0047AB',
    type: 'bank',
  },
  {
    id: 'chapa_dashen',
    name: 'Dashen Bank',
    description: 'Amole by Dashen Bank',
    provider: 'chapa',
    icon: '🏦',
    color: '#003366',
    type: 'bank',
  },
  {
    id: 'chapa_abyssinia',
    name: 'Abyssinia Bank',
    description: 'Bank of Abyssinia',
    provider: 'chapa',
    icon: '🏦',
    color: '#8B0000',
    type: 'bank',
  },
  {
    id: 'chapa_united',
    name: 'United Bank',
    description: 'United Bank of Ethiopia',
    provider: 'chapa',
    icon: '🏦',
    color: '#006400',
    type: 'bank',
  },
  {
    id: 'chapa_oromia',
    name: 'Oromia Bank',
    description: 'Cooperative Bank of Oromia',
    provider: 'chapa',
    icon: '🏦',
    color: '#FF8C00',
    type: 'bank',
  },
  {
    id: 'chapa_nib',
    name: 'NIB Bank',
    description: 'NIB International Bank',
    provider: 'chapa',
    icon: '🏦',
    color: '#191970',
    type: 'bank',
  },
  {
    id: 'chapa_berhan',
    name: 'Berhan Bank',
    description: 'Berhan Bank S.C.',
    provider: 'chapa',
    icon: '🏦',
    color: '#4B0082',
    type: 'bank',
  },
  {
    id: 'chapa_bunna',
    name: 'Bunna Bank',
    description: 'Bunna International Bank',
    provider: 'chapa',
    icon: '🏦',
    color: '#556B2F',
    type: 'bank',
  },
  {
    id: 'chapa_zemen',
    name: 'Zemen Bank',
    description: 'Zemen Bank S.C.',
    provider: 'chapa',
    icon: '🏦',
    color: '#2F4F4F',
    type: 'bank',
  },
  {
    id: 'chapa_enat',
    name: 'Enat Bank',
    description: 'Enat Bank S.C.',
    provider: 'chapa',
    icon: '🏦',
    color: '#8B4513',
    type: 'bank',
  },
  // International
  {
    id: 'stripe',
    name: 'Credit / Debit Card',
    description: 'Visa, Mastercard, Amex',
    provider: 'stripe',
    icon: '💳',
    color: '#6772E5',
    type: 'card',
  },
]

interface PaymentMethodsProps {
  selected: PaymentMethodId | null
  onSelect: (method: PaymentMethodId) => void
}

export function PaymentMethods({ selected, onSelect }: PaymentMethodsProps) {
  const [activeTab, setActiveTab] = useState<'wallet' | 'bank' | 'card'>('wallet')

  const wallets = PAYMENT_METHODS.filter((m) => m.type === 'wallet')
  const banks = PAYMENT_METHODS.filter((m) => m.type === 'bank')
  const cards = PAYMENT_METHODS.filter((m) => m.type === 'card')

  const tabs = [
    { id: 'wallet' as const, label: 'Mobile Wallets', icon: Smartphone, count: wallets.length },
    { id: 'bank' as const, label: 'Banks', icon: CreditCard, count: banks.length },
    { id: 'card' as const, label: 'Card', icon: CreditCard, count: cards.length },
  ]

  const displayMethods =
    activeTab === 'wallet' ? wallets :
    activeTab === 'bank' ? banks : cards

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm">Payment Method</h3>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-all',
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Method grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {displayMethods.map((method) => (
          <button
            key={method.id}
            type="button"
            onClick={() => onSelect(method.id)}
            className={cn(
              'relative flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all hover:border-primary/50',
              selected === method.id
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border bg-card'
            )}
          >
            {method.popular && (
              <span className="absolute -top-2 right-2 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-primary-foreground">
                Popular
              </span>
            )}
            <div className="flex w-full items-start justify-between">
              <span className="text-2xl">{method.icon}</span>
              {selected === method.id && (
                <CheckCircle className="h-4 w-4 text-primary shrink-0" />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold leading-tight">{method.name}</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{method.description}</p>
            </div>
            {/* Provider badge */}
            <span
              className="text-[9px] font-medium rounded-full px-1.5 py-0.5"
              style={{
                backgroundColor: `${method.color}15`,
                color: method.color,
                border: `1px solid ${method.color}30`,
              }}
            >
              {method.provider === 'chapa' ? 'via Chapa' : method.provider === 'arifpay' ? 'ArifPay' : 'Stripe'}
            </span>
          </button>
        ))}
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        <span className="text-base">🔒</span>
        <p>All transactions are encrypted and secure. Your payment details are never stored on our servers.</p>
      </div>
    </div>
  )
}

export { PAYMENT_METHODS }
