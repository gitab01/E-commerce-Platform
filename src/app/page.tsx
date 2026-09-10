import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ShieldCheck, Truck, RefreshCw, Headphones, Star, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProductGrid } from '@/components/products/product-grid'
import prisma from '@/lib/prisma'
import type { ProductWithCategory } from '@/types'

async function getFeaturedProducts(): Promise<ProductWithCategory[]> {
  try {
    const products = await prisma.product.findMany({
      where: { featured: true, published: true },
      include: {
        category: true,
        _count: { select: { reviews: true } },
        reviews: { select: { rating: true } },
      },
      take: 8,
      orderBy: { createdAt: 'desc' },
    })
    return products.map((p) => ({
      ...p,
      averageRating: p.reviews.length > 0
        ? p.reviews.reduce((a, r) => a + r.rating, 0) / p.reviews.length
        : 0,
    })) as ProductWithCategory[]
  } catch {
    return []
  }
}

const CATEGORIES = [
  { name: 'Electronics', icon: '💻', slug: 'electronics', color: 'from-blue-500/10 to-blue-600/5' },
  { name: 'Fashion', icon: '👗', slug: 'fashion', color: 'from-pink-500/10 to-pink-600/5' },
  { name: 'Home & Living', icon: '🏠', slug: 'home-living', color: 'from-green-500/10 to-green-600/5' },
  { name: 'Beauty', icon: '💄', slug: 'beauty', color: 'from-purple-500/10 to-purple-600/5' },
  { name: 'Sports', icon: '⚽', slug: 'sports', color: 'from-orange-500/10 to-orange-600/5' },
  { name: 'Books', icon: '📚', slug: 'books', color: 'from-yellow-500/10 to-yellow-600/5' },
]

const FEATURES = [
  { icon: Truck, title: 'Free Delivery', desc: 'Orders over ETB 2,000', color: 'text-blue-600' },
  { icon: ShieldCheck, title: 'Secure Payment', desc: 'All Ethiopian banks & wallets', color: 'text-green-600' },
  { icon: RefreshCw, title: 'Easy Returns', desc: '14-day return policy', color: 'text-purple-600' },
  { icon: Headphones, title: '24/7 Support', desc: 'We\'re here to help', color: 'text-orange-600' },
]

const PAYMENT_LOGOS = [
  { name: 'Telebirr', emoji: '📱' },
  { name: 'CBE', emoji: '🏦' },
  { name: 'Chapa', emoji: '💚' },
  { name: 'ArifPay', emoji: '💜' },
  { name: 'Awash', emoji: '🏦' },
  { name: 'Dashen', emoji: '🏦' },
  { name: 'BOA', emoji: '🏦' },
]

export default async function HomePage() {
  const featuredProducts = await getFeaturedProducts()

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/5 border-b border-border">
        <div className="container py-16 md:py-24 lg:py-32">
          <div className="mx-auto max-w-3xl text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Zap className="h-3.5 w-3.5" />
              <span>Ethiopia&apos;s Modern Shopping Platform</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              Shop Smart, Pay Your
              <span className="text-primary"> Way</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Discover thousands of products and pay with Telebirr, CBE, Chapa, ArifPay, and all your favorite Ethiopian banks.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/products">
                  Shop Now <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/register">Create Account</Link>
              </Button>
            </div>

            {/* Payment methods strip */}
            <div className="flex flex-wrap justify-center gap-2 pt-4">
              <span className="text-xs text-muted-foreground self-center">Pay with:</span>
              {PAYMENT_LOGOS.map((p) => (
                <span
                  key={p.name}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium shadow-sm"
                >
                  <span>{p.emoji}</span>
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Decorative circles */}
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -right-40 -bottom-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      </section>

      {/* Features */}
      <section className="border-b border-border bg-muted/30">
        <div className="container py-8">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background border border-border ${f.color}`}>
                  <f.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Shop by Category</h2>
            <p className="text-muted-foreground text-sm mt-1">Find exactly what you&apos;re looking for</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/products">View All</Link>
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/products?category=${cat.slug}`}
              className={`flex flex-col items-center gap-2 rounded-xl border border-border bg-gradient-to-br ${cat.color} p-4 text-center transition-all hover:shadow-md hover:-translate-y-0.5`}
            >
              <span className="text-3xl">{cat.icon}</span>
              <span className="text-xs font-semibold">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="container py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Featured Products</h2>
            <p className="text-muted-foreground text-sm mt-1">Handpicked for you</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/products?featured=true">View All <ArrowRight className="h-3.5 w-3.5" /></Link>
          </Button>
        </div>
        <ProductGrid products={featuredProducts} />
      </section>

      {/* Payment Partners */}
      <section className="border-t border-border bg-muted/30">
        <div className="container py-12">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold">Trusted Payment Partners</h2>
            <p className="text-sm text-muted-foreground mt-1">Pay securely with any Ethiopian bank or wallet</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { name: 'Telebirr', emoji: '📱', desc: 'Ethio Telecom' },
              { name: 'CBE Birr', emoji: '🏦', desc: 'Commercial Bank of Ethiopia' },
              { name: 'Chapa', emoji: '💚', desc: 'Multi-bank gateway' },
              { name: 'ArifPay', emoji: '💜', desc: 'All-in-one payment' },
              { name: 'Awash Bank', emoji: '🏦', desc: 'Awash Birr' },
              { name: 'Dashen Bank', emoji: '🏦', desc: 'Amole wallet' },
              { name: 'BOA', emoji: '🏦', desc: 'Bank of Abyssinia' },
              { name: 'Stripe', emoji: '💳', desc: 'International cards' },
            ].map((p) => (
              <div key={p.name} className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 shadow-sm">
                <span className="text-2xl">{p.emoji}</span>
                <div>
                  <p className="text-xs font-semibold">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="container py-12">
        <div className="rounded-2xl bg-gradient-to-r from-primary to-primary/80 p-8 md:p-12 text-primary-foreground text-center space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold">Ready to start shopping?</h2>
          <p className="text-primary-foreground/80 max-w-md mx-auto">
            Join thousands of Ethiopians shopping smarter with Shega Market.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild variant="secondary" size="lg">
              <Link href="/products">Browse Products</Link>
            </Button>
            <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
              <Link href="/register">Sign Up Free</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
