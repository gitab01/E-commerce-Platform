import Link from 'next/link'
import { Store, Mail, Phone, MapPin, Facebook, Twitter, Instagram } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="container py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Store className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">Shega Market</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ethiopia&apos;s modern e-commerce platform. Shop with confidence using your favorite local payment method.
            </p>
            <div className="flex gap-3">
              <a href="#" aria-label="Facebook" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-accent transition-colors">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="#" aria-label="Twitter" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-accent transition-colors">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="#" aria-label="Instagram" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-accent transition-colors">
                <Instagram className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Shop */}
          <div className="space-y-4">
            <h4 className="font-semibold">Shop</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                { href: '/products', label: 'All Products' },
                { href: '/products?featured=true', label: 'Featured Items' },
                { href: '/products?sort=newest', label: 'New Arrivals' },
                { href: '/products?sort=price_asc', label: 'Deals' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div className="space-y-4">
            <h4 className="font-semibold">Account</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                { href: '/login', label: 'Sign In' },
                { href: '/register', label: 'Create Account' },
                { href: '/orders', label: 'My Orders' },
                { href: '/profile', label: 'My Profile' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Payments */}
          <div className="space-y-4">
            <h4 className="font-semibold">Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>Addis Ababa, Ethiopia</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" />
                <a href="tel:+251911000000" className="hover:text-foreground">+251 911 000 000</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" />
                <a href="mailto:support@shegamarket.et" className="hover:text-foreground">support@shegamarket.et</a>
              </li>
            </ul>
            {/* Payment badges */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium">Payment Methods</p>
              <div className="flex flex-wrap gap-1.5">
                {['Telebirr', 'CBE', 'Chapa', 'ArifPay', 'Awash', 'Dashen'].map((p) => (
                  <span key={p} className="inline-flex items-center rounded-md border border-border bg-background px-2 py-0.5 text-[10px] font-medium">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Shega Market. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
            <Link href="/refund" className="hover:text-foreground">Refund Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
