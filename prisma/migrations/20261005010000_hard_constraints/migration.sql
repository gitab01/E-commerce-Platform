-- The database, not the application, is the last line of defence against
-- overselling. Each guard is wrapped so re-running this file is a no-op, which
-- lets `npm run db:hardening` repair a database built with `prisma db push`.
DO $$ BEGIN
  ALTER TABLE "variants" ADD CONSTRAINT "variants_stock_non_negative" CHECK ("stock" >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "variants" ADD CONSTRAINT "variants_price_positive" CHECK ("priceCents" > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "order_items" ADD CONSTRAINT "order_items_quantity_positive" CHECK ("quantity" > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Reconciliation scans PENDING orders by expiry.
CREATE INDEX IF NOT EXISTS "orders_status_expires_at_idx" ON "orders" ("status", "expiresAt");
