import axios from 'axios'
import type { ChapaPaymentPayload, PaymentResult } from '@/types'

const CHAPA_BASE_URL = 'https://api.chapa.co/v1'

export async function initiateChapaPayment(payload: ChapaPaymentPayload): Promise<PaymentResult> {
  try {
    const response = await axios.post(
      `${CHAPA_BASE_URL}/transaction/initialize`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (response.data.status === 'success') {
      return {
        success: true,
        checkoutUrl: response.data.data.checkout_url,
        transactionId: payload.tx_ref,
        provider: 'chapa',
      }
    }

    return {
      success: false,
      message: response.data.message || 'Payment initialization failed',
      provider: 'chapa',
    }
  } catch (error: any) {
    return {
      success: false,
      message: error?.response?.data?.message || 'Chapa payment failed',
      provider: 'chapa',
    }
  }
}

export async function verifyChapaPayment(txRef: string): Promise<{ success: boolean; status?: string }> {
  try {
    const response = await axios.get(
      `${CHAPA_BASE_URL}/transaction/verify/${txRef}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
        },
      }
    )

    return {
      success: response.data.status === 'success',
      status: response.data.data?.status,
    }
  } catch {
    return { success: false }
  }
}

// Supported Ethiopian banks via Chapa
export const CHAPA_PAYMENT_METHODS = [
  { id: 'telebirr', name: 'Telebirr', icon: '📱', color: '#0066CC' },
  { id: 'cbe_birr', name: 'CBE Birr', icon: '🏦', color: '#007A3D' },
  { id: 'boa', name: 'Bank of Abyssinia', icon: '🏦', color: '#C8102E' },
  { id: 'awash', name: 'Awash Bank', icon: '🏦', color: '#0047AB' },
  { id: 'dashen', name: 'Dashen Bank', icon: '🏦', color: '#003366' },
  { id: 'abyssinia', name: 'Abyssinia Bank', icon: '🏦', color: '#8B0000' },
  { id: 'united', name: 'United Bank', icon: '🏦', color: '#006400' },
  { id: 'oromia', name: 'Oromia Bank', icon: '🏦', color: '#FF8C00' },
  { id: 'nib', name: 'NIB Bank', icon: '🏦', color: '#191970' },
  { id: 'berhan', name: 'Berhan Bank', icon: '🏦', color: '#4B0082' },
  { id: 'bunna', name: 'Bunna Bank', icon: '🏦', color: '#556B2F' },
  { id: 'zemen', name: 'Zemen Bank', icon: '🏦', color: '#2F4F4F' },
  { id: 'enat', name: 'Enat Bank', icon: '🏦', color: '#8B4513' },
  { id: 'mpesa', name: 'M-Pesa', icon: '📱', color: '#00A651' },
]
