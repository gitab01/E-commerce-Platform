# Shega Mart

Storefront + admin system where inventory, cart and payment state cannot disagree — even when two people buy the
last unit at the same time.

Next.js 16 (App Router, server actions) · TypeScript · PostgreSQL (Neon) · Prisma 6 · Stripe Checkout · **Chapa**
(telebirr / CBE Birr / Ethiopian cards) · Tailwind CSS v4.

## The invariant this codebase is built around

Nothing may produce an inconsistent state: no negative stock, no paid-but-missing order, no order marked paid without
a verified gateway event.

| Rule | Where it is enforced |
| --- | --- |
| Concurrent checkout on the last unit resolves to one winner | conditional `UPDATE ... WHERE stock >= qty` inside the checkout transaction (`src/lib/checkout.ts`), plus `CHECK (stock >= 0)` in Postgres (`prisma/migrations/20261005010000_hard_constraints/migration.sql`) |
| Payment truth comes from webhooks, never the redirect | `src/app/api/webhooks/{stripe,chapa}/route.ts` → `markOrderPaid` (`src/lib/fulfillment.ts`); the success URL only renders a page |
| Cart prices are re-validated server-side | `loadCartLines` reads prices from the variant rows; the request never carries a price |
| Abandoned checkouts release stock | `reservedAt`/`expiresAt` + `reconcileStaleReservations`, run by Vercel Cron every 10 minutes (`vercel.json`) |
| A retried webhook cannot double-apply | `(provider, externalId)` unique row written in the same transaction as the status change |
| Illegal transitions are visible, not silent | `assertTransition` in `src/lib/order-state.ts`; rejections are recorded in `order_events` |

Money is integer minor units of one base currency (`BASE_CURRENCY`, default ETB santim). A gateway that presents
another currency converts once at its own boundary (`src/lib/currency.ts`) and refuses to guess a rate.

## Flow

```
cart (server-side, keyed to an httpOnly session cookie)
  └─ checkout: BEGIN → re-read prices → conditional stock decrement → INSERT order(PENDING) + immutable line items → COMMIT
       └─ gateway session created AFTER the commit, so a webhook always resolves to a row
            └─ signed webhook → PaymentEvent + status PAID
                 └─ admin ships → customer sees the timeline
```

Order states: `PENDING → PAID → SHIPPED → DELIVERED`, with `PENDING/PAID → CANCELLED` and `PENDING → EXPIRED`.

## Payment providers

Both are behind one interface (`src/lib/payments/types.ts`); the provider chosen at checkout is stored on the order,
and each has its own webhook route.

- **Chapa** — `POST {CHAPA_BASE_URL}/transaction/initialize`, `tx_ref` = our order reference, `callback_url` = our
  webhook. Confirmation is `verified.transaction`, verified as HMAC-SHA256 (base64, `X-Chapa-Signature`) over the raw
  body. The reconciliation job also calls the verify endpoint, so a lost webhook cannot expire a paid order.
- **Stripe** — Checkout Session with `client_reference_id` = order reference (lets an early webhook resolve the order
  before the session id is stored). Signature-verified, idempotent on event id.
- **Demo** — `DEMO_PAYMENTS=true` adds a provider that completes orders with no charge for screenshots and CI. It still
  routes confirmation through the fulfilment service, never through the browser.

Offered providers come from `PAYMENT_PROVIDERS` intersected with the credentials actually present; checkout re-checks
server-side so a stale button cannot select an unconfigured gateway.

## Setup

```bash
cp .env.example .env      # fill DATABASE_URL, DIRECT_DATABASE_URL, gateway keys
npm install
npm run db:deploy         # applies both committed migrations, including the CHECK constraints
npm run db:seed           # sample catalogue + admin login
npm run dev
```

`npm run db:up` (`prisma migrate dev`) is for authoring new migrations, not for setup. If you ever build a database
with `prisma db push` instead of migrations, `npm run db:hardening` re-applies the constraint migration on top.

Seed admin credentials come from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`; change them before seeding a shared
database.

### Tests

```bash
npm run test:unit   # state machine, money, currency boundary, webhook signatures, asset keys — no database needed
npm run test        # adds the concurrency and webhook-replay suites; requires DATABASE_URL
```

The concurrency test fires 8 parallel checkouts against a variant with one unit and asserts exactly one order, stock 0,
and no oversell.

```bash
npm run verify:ui   # headless Chrome: browse -> cart -> checkout -> pay -> admin transitions -> stock guard -> CRUD
```

It walks the real UI at 1280px and 390px, asserts the order row's status badge after each admin transition, checks that
an over-draw is refused with the database's own message, creates a throwaway product through the dashboard, buys
nothing with it, deletes it again, and confirms that deleting a sold product or demoting yourself is refused. It fails
on any horizontal overflow on mobile. Screenshots are written to `<temp>/qoder-ecom/shots`.

## Caching

`/`, `/products` and every `/products/[slug]` are prerendered and revalidated every 60 seconds, and a stock change
calls `revalidatePath` for that product so a sold-out variant cannot keep serving a cached "in stock". That is why the
header takes its cart count and role from `GET /api/nav` after hydration rather than reading a cookie during render: a
single session read in the root layout would force every catalogue page to render on demand. Cart, checkout, order
tracking, account and admin are dynamic by design.

## Deployment (Vercel)

- Build command `vercel-build` runs `prisma generate && prisma migrate deploy && next build`; migrations never run at
  application startup.
- `vercel.json` schedules `/api/cron/reconcile` every 10 minutes; the route requires `Authorization: Bearer $CRON_SECRET`.
- Env: `DATABASE_URL` (Neon pooled), `DIRECT_DATABASE_URL` (Neon direct, for migrations), `APP_URL`, gateway keys,
  `CRON_SECRET`. Optional: `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`,
  `S3_BUCKET` — without them admin image uploads report that storage is not configured.
- Point the gateway webhooks at `https://<host>/api/webhooks/chapa` and `/api/webhooks/stripe`.

## Admin

`/admin` — revenue that only counts gateway-confirmed orders, counts per state, held reservations, low-stock list,
manual reconciliation run. `/admin/orders` — filter by state or search reference/email, inline legal transitions only.
`/admin/orders/[id]` — line items with prices frozen at purchase time, payment detail, full audit trail.
`/admin/inventory` — stock adjustments; a negative that would cross zero is rejected by the database constraint, and
every adjustment is written to `audit_log`.
`/admin/assets` — replace a product's image with an upload; the bytes go to object storage and the swap is audited.
`/admin/products` — create, edit and delete catalogue entries; variants are added inline, with prices typed in whole
Birr and stored as integer cents. A row that appears in `order_items` cannot be deleted — the write is refused and the
product is hidden instead, because immutable line items are what keep past orders readable.
`/admin/customers` — search accounts, see confirmed spend and order history, promote or demote a role. An admin cannot
change their own role, the last admin cannot be demoted, and an account with orders is never deleted: those orders carry
`userId`, and removing it would silently rewrite them as guest purchases.

Access is gated twice: the admin layout checks the session, and every admin mutation re-reads the role from the
database — so revoking a role takes effect on the next request.

## Object storage

Uploaded product images are written to Neon's S3-compatible bucket (`src/lib/assets.ts`) and read back through
`/api/assets/<key>`, so the bucket can stay private. Keys are `products/<slug>-<content hash>.<ext>`: identical bytes
resolve to the same URL, which is why the route can answer `immutable`. The route accepts only that one flat shape and
derives the content type from the extension it handed out, so an uploaded file can never be served as anything but an
image. Without the `AWS_*`/`S3_BUCKET` variables the seeded local artwork keeps working.

## Data model

`categories` → `products` → `variants` (sku, priceCents, stock, `CHECK stock >= 0`) · `carts`/`cart_items` keyed by
session · `orders` (state machine, reservation timestamps, unique `providerSessionId`) → `order_items` (immutable price
copy) · `order_events` (audit trail incl. rejected transitions) · `payment_events` (webhook idempotency) ·
`users`/`sessions` (only a SHA-256 hash of the session token is stored) · `audit_log`.

Indexes: `(status, reservedAt)` and `(status, expiresAt)` for the reconciliation scan, `(userId, createdAt)` for order
history.

## Layout

```
prisma/schema.prisma            data model, enums, constraints
prisma/migrations/              baseline schema + CHECK constraints and covering index
prisma/seed.ts                  catalogue, admin, sample shopper
src/lib/checkout.ts             price re-validation + conditional reservation transaction
src/lib/fulfillment.ts          markPaid / cancel / advance / reconcile
src/lib/order-state.ts          the transition table, in one place
src/lib/payments/               one interface, stripe + chapa + demo adapters
src/lib/assets.ts               Neon S3 upload/read, key shape and content typing
src/app/api/webhooks/           signature verification, idempotent application
src/app/api/cron/reconcile/     scheduled stock release
src/app/api/nav/                cart count and role, fetched after hydration
src/app/api/assets/             serves uploaded artwork from the private bucket
src/app/                        storefront, cart, checkout, order tracking, account, admin
tests/                          concurrency, webhook replay, state machine, money, signatures, asset keys
scripts/verify-ui.mjs           headless-Chrome walkthrough of both surfaces
```
