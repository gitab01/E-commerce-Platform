# 🛍️ Shega Market — Ethiopian E-Commerce Platform

A production-ready, full-stack e-commerce platform built with **Next.js 14**, **PostgreSQL**, **Prisma**, and full Ethiopian payment gateway integration.

![Tech Stack](https://img.shields.io/badge/Next.js-14-black?logo=next.js) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript) ![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma) ![Tailwind](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss)

---

## ✨ Features

### 🛒 Shopping
- Product catalog with search, filter by category, and sort
- Product detail pages with image gallery and reviews
- Persistent shopping cart (Zustand + localStorage)
- Cart drawer with real-time item count

### 💳 Ethiopian Payment Integration
| Gateway | Methods |
|---------|---------|
| **Chapa** | Telebirr, CBE Birr, Bank of Abyssinia, Awash Bank, Dashen (Amole), United Bank, Oromia Bank, NIB, Berhan, Bunna, Zemen, Enat |
| **ArifPay** | Telebirr, eBirr, Awash Birr, Amole, CBE Birr, M-Pesa |
| **Stripe** | Visa, Mastercard, Amex (international) |

### 👤 Authentication
- Email/password registration and login
- NextAuth.js with JWT sessions
- Role-based access (User / Admin)

### 📦 Orders
- Full order lifecycle: Pending → Processing → Shipped → Delivered
- Payment status tracking (Pending / Paid / Failed)
- Webhook handlers for Chapa, ArifPay, and Stripe
- Order history for customers

### 🔧 Admin Dashboard
- Revenue, orders, products, customer stats
- Product management (CRUD)
- Order management with status updates
- Recent orders overview

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Chapa account: [chapa.co](https://chapa.co)
- ArifPay account: [arifpay.net](https://arifpay.net)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/gitab01/E-commerce-Platform.git
cd E-commerce-Platform

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your actual keys

# 4. Set up the database
npx prisma db push

# 5. Seed with sample data
npm run db:seed

# 6. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Test Accounts (after seeding)
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@shegamarket.et | Admin@123 |
| User | user@shegamarket.et | User@123 |

---

## 🌍 Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ecommerce"

# NextAuth
NEXTAUTH_SECRET="your-secret-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"

# Chapa (https://chapa.co)
CHAPA_SECRET_KEY="CHASECK_TEST-..."
NEXT_PUBLIC_CHAPA_PUBLIC_KEY="CHAPUBK_TEST-..."

# ArifPay (https://arifpay.net)
ARIFPAY_API_KEY="your-arifpay-api-key"
ARIFPAY_MERCHANT_ID="your-merchant-id"

# Stripe (optional, for international cards)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="Shega Market"
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/login, register    # Auth pages
│   ├── products/                 # Product listing & detail
│   ├── cart/                     # Cart page
│   ├── checkout/                 # Checkout + success
│   ├── orders/                   # Customer orders
│   ├── admin/                    # Admin dashboard
│   └── api/                      # API routes
│       ├── auth/                 # NextAuth + register
│       ├── products/             # Product CRUD
│       ├── orders/               # Order management
│       └── webhooks/             # Chapa, ArifPay, Stripe
├── components/
│   ├── ui/                       # Button, Input, Card, Badge, Toast
│   ├── layout/                   # Navbar, Footer, Admin sidebar
│   ├── products/                 # Product card, grid, form
│   ├── cart/                     # Cart item, summary, drawer
│   └── checkout/                 # Checkout form, payment methods
├── lib/
│   ├── prisma.ts                 # DB client
│   ├── auth.ts                   # NextAuth config
│   ├── chapa.ts                  # Chapa payment integration
│   ├── arifpay.ts                # ArifPay integration
│   ├── stripe.ts                 # Stripe integration
│   └── utils.ts                  # Helpers
└── store/
    └── cart-store.ts             # Zustand cart state
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | NextAuth.js |
| Styling | Tailwind CSS |
| State | Zustand |
| Payments | Chapa, ArifPay, Stripe |
| Validation | Zod |

---

## 📝 License

MIT License — free to use and modify.

---

Built with ❤️ for Ethiopia 🇪🇹
