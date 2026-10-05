import { PrismaClient, type PaymentProvider } from '@prisma/client';
import { randomUUID } from 'node:crypto';

export const prisma = new PrismaClient();

process.env.DEMO_PAYMENTS = 'true';
process.env.APP_URL ??= 'http://localhost:3000';
process.env.BASE_CURRENCY ??= 'ETB';

export const hasDatabase = Boolean(process.env.DATABASE_URL);

export type Fixture = { variantId: string; productId: string; sku: string };

/** A unique SKU per run keeps parallel CI runs from colliding on the same row. */
export async function createSellableUnit(stock: number, priceCents = 5000): Promise<Fixture> {
  const tag = randomUUID().slice(0, 8).toUpperCase();
  const category = await prisma.category.upsert({
    where: { slug: 'test-category' },
    create: { slug: 'test-category', name: 'Test category' },
    update: {},
  });
  const product = await prisma.product.create({
    data: {
      slug: `test-product-${tag}`,
      title: `Test product ${tag}`,
      description: 'Created by the test suite.',
      image: '/products/headphones.svg',
      categoryId: category.id,
      active: true,
    },
  });
  const variant = await prisma.variant.create({
    data: { productId: product.id, sku: `TST-${tag}`, name: 'Default', priceCents, stock },
  });
  return { variantId: variant.id, productId: product.id, sku: variant.sku };
}

export async function cartWith(sessionId: string, variantId: string, quantity: number) {
  const cart = await prisma.cart.create({ data: { sessionId } });
  await prisma.cartItem.create({ data: { cartId: cart.id, variantId, quantity } });
  return cart;
}

export const DEMO: PaymentProvider = 'DEMO';

export function checkoutInput(email = `shopper-${randomUUID().slice(0, 8)}@example.com`) {
  return {
    email,
    fullName: 'Test Shopper',
    addressLine: '1 Test Street',
    city: 'Addis Ababa',
    provider: DEMO,
    userId: null,
  };
}

export async function purge(runnables: { productId?: string; orderId?: string; sessionId?: string }[] = []) {
  const productIds = runnables.map((entry) => entry.productId).filter(Boolean) as string[];
  if (productIds.length) {
    const variants = await prisma.variant.findMany({ where: { productId: { in: productIds } }, select: { id: true } });
    const variantIds = variants.map((variant) => variant.id);
    await prisma.orderItem.deleteMany({ where: { variantId: { in: variantIds } } });
    await prisma.cartItem.deleteMany({ where: { variantId: { in: variantIds } } });
    await prisma.variant.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  }
}

export async function resetTestData() {
  await prisma.paymentEvent.deleteMany({ where: { provider: 'DEMO' } });
  await prisma.orderItem.deleteMany({ where: { variant: { product: { slug: { startsWith: 'test-product-' } } } } });
  await prisma.cartItem.deleteMany({ where: { variant: { product: { slug: { startsWith: 'test-product-' } } } } });
  await prisma.orderEvent.deleteMany({ where: { order: { email: { contains: 'example.com' } } } });
  await prisma.order.deleteMany({ where: { email: { contains: '@example.com' }, status: { in: ['PENDING', 'PAID', 'EXPIRED', 'CANCELLED'] } } });
  await prisma.cart.deleteMany({ where: { sessionId: { startsWith: 'test-session-' } } });
  await prisma.variant.deleteMany({ where: { product: { slug: { startsWith: 'test-product-' } } } });
  await prisma.product.deleteMany({ where: { slug: { startsWith: 'test-product-' } } });
}
