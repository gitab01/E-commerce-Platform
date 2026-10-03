-- Applied after the Prisma baseline migration. These are the constraints the
-- application cannot enforce on its own.
ALTER TABLE "variants"
  ADD CONSTRAINT "variants_stock_non_negative" CHECK ("stock" >= 0);

ALTER TABLE "variants"
  ADD CONSTRAINT "variants_price_positive" CHECK ("priceCents" > 0);

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_quantity_positive" CHECK ("quantity" > 0);

-- Reconciliation scans PENDING orders by expiry; covering index keeps it cheap.
CREATE INDEX IF NOT EXISTS "orders_status_expires_at_idx"
  ON "orders" ("status", "expiresAt");
