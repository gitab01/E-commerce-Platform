import axios from 'axios'
import type { ArifPayPaymentPayload, PaymentResult } from '@/types'

const ARIFPAY_BASE_URL = 'https://gateway.arifpay.net/api'

export async function initiateArifPaySession(payload: ArifPayPaymentPayload): Promise<PaymentResult> {
  try {
    const response = await axios.post(
      `${ARIFPAY_BASE_URL}/checkout/session`,
      payload,
      {
        headers: {
          'x-arifpay-key': process.env.ARIFPAY_API_KEY!,
          'Content-Type': 'application/json',
        },
      }
    )

    if (response.data.error === false && response.data.data?.sessionUrl) {
      return {
        success: true,
        checkoutUrl: response.data.data.sessionUrl,
        transactionId: response.data.data.sessionId,
        provider: 'arifpay',
      }
    }

    return {
      success: false,
      message: response.data.msg || 'ArifPay session creation failed',
      provider: 'arifpay',
    }
  } catch (error: any) {
    return {
      success: false,
      message: error?.response?.data?.msg || 'ArifPay payment failed',
      provider: 'arifpay',
    }
  }
}

export async function verifyArifPaySession(sessionId: string): Promise<{ success: boolean; status?: string }> {
  try {
    const response = await axios.get(
      `${ARIFPAY_BASE_URL}/checkout/session/${sessionId}`,
      {
        headers: {
          'x-arifpay-key': process.env.ARIFPAY_API_KEY!,
        },
      }
    )

    return {
      success: response.data.error === false,
      status: response.data.data?.paymentStatus,
    }
  } catch {
    return { success: false }
  }
}

export function buildArifPayPayload(
  order: {
    id: string
    total: number
    items: Array<{ name: string; price: number; quantity: number; image?: string | null }>
  },
  merchantAccount: string
): ArifPayPaymentPayload {
  const expireDate = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return {
    beneficiaries: [
      {
        accountNumber: merchantAccount,
        bank: 'ARIFPAY',
        amount: order.total,
      },
    ],
    cancelUrl: `${appUrl}/checkout?cancelled=true`,
    errorUrl: `${appUrl}/checkout?error=true`,
    nonce: order.id,
    notifyUrl: `${appUrl}/api/webhooks/arifpay`,
    paymentMethods: ['TELEBIRR', 'EBIRR', 'AWASH_BIRR', 'AMOLE'],
    successUrl: `${appUrl}/checkout/success?orderId=${order.id}&provider=arifpay`,
    expireDate,
    items: order.items.map((item) => ({
      description: item.name,
      image: item.image || '',
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      taxAmount: 0,
    })),
    store: {
      name: process.env.NEXT_PUBLIC_APP_NAME || 'Shega Market',
      email: 'support@shegamarket.et',
      phone: '+251911000000',
      website: appUrl,
    },
  }
}

// ArifPay supported banks/wallets
export const ARIFPAY_PAYMENT_METHODS = [
  { id: 'TELEBIRR', name: 'Telebirr', icon: '📱', color: '#0066CC' },
  { id: 'EBIRR', name: 'eBirr', icon: '📱', color: '#4CAF50' },
  { id: 'AWASH_BIRR', name: 'Awash Birr', icon: '📱', color: '#0047AB' },
  { id: 'AMOLE', name: 'Amole (Dashen)', icon: '📱', color: '#003366' },
  { id: 'CBE_BIRR', name: 'CBE Birr', icon: '🏦', color: '#007A3D' },
  { id: 'MPESA', name: 'M-Pesa', icon: '📱', color: '#00A651' },
]
