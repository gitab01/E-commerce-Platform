import type { Product, Category, Order, OrderItem, User, Review, Address } from '@prisma/client'

export type { Role, OrderStatus, PaymentStatus, PaymentMethod } from '@prisma/client'

// Extended types with relations
export type ProductWithCategory = Product & {
  category: Category
  reviews?: Review[]
  _count?: { reviews: number }
  averageRating?: number
}

export type OrderWithItems = Order & {
  items: (OrderItem & { product: Product })[]
  user?: User
}

export type CartItem = {
  id: string
  productId: string
  name: string
  price: number
  image: string
  quantity: number
  stock: number
}

export type CartState = {
  items: CartItem[]
  isOpen: boolean
}

// Payment types
export type PaymentProvider = 'chapa' | 'arifpay' | 'stripe'

export type ChapaPaymentPayload = {
  amount: number
  currency: string
  email: string
  first_name: string
  last_name: string
  phone_number?: string
  tx_ref: string
  callback_url: string
  return_url: string
  customization?: {
    title?: string
    description?: string
  }
}

export type ArifPayPaymentPayload = {
  beneficiaries: Array<{
    accountNumber: string
    bank: string
    amount: number
  }>
  cancelUrl: string
  errorUrl: string
  nonce: string
  notifyUrl: string
  paymentMethods?: string[]
  successUrl: string
  expireDate: string
  items: Array<{
    description: string
    image?: string
    name: string
    price: number
    quantity: number
    taxAmount: number
  }>
  store: {
    name: string
    email?: string
    phone: string
    website?: string
  }
}

export type PaymentResult = {
  success: boolean
  transactionId?: string
  checkoutUrl?: string
  message?: string
  provider: PaymentProvider
}

// API response types
export type ApiResponse<T> = {
  data?: T
  error?: string
  message?: string
}

export type PaginatedResponse<T> = {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Filter types
export type ProductFilters = {
  search?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'rating'
  page?: number
  pageSize?: number
  featured?: boolean
}

export type OrderFilters = {
  status?: string
  page?: number
  pageSize?: number
}

// Dashboard stats
export type DashboardStats = {
  totalRevenue: number
  totalOrders: number
  totalProducts: number
  totalCustomers: number
  recentOrders: OrderWithItems[]
  revenueByMonth: { month: string; revenue: number }[]
}

// Form types
export type ShippingAddress = {
  firstName: string
  lastName: string
  email: string
  phone: string
  street: string
  city: string
  state: string
  country: string
  postalCode?: string
}

export type CheckoutFormData = {
  shippingAddress: ShippingAddress
  paymentMethod: string
  notes?: string
}
