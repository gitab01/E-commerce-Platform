import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { CartDrawer } from '@/components/cart/cart-drawer'
import { Providers } from './providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: { default: 'Shega Market', template: '%s | Shega Market' },
  description: "Ethiopia's modern e-commerce platform with secure local payment options including Telebirr, CBE, Chapa, and ArifPay.",
  keywords: ['ethiopia', 'ecommerce', 'shopping', 'telebirr', 'chapa', 'arifpay', 'online shopping'],
  openGraph: {
    type: 'website',
    locale: 'en_ET',
    url: 'https://shegamarket.et',
    siteName: 'Shega Market',
    title: 'Shega Market - Shop with Ethiopian Payment Methods',
    description: "Ethiopia's modern e-commerce platform",
  },
  twitter: { card: 'summary_large_image' },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <Providers session={session}>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <CartDrawer />
        </Providers>
      </body>
    </html>
  )
}
