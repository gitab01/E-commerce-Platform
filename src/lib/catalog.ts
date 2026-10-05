import { prisma } from './db';

export const CATALOG_REVALIDATE_SECONDS = 60;

export function publishedProducts(where: PrismaWhere = {}) {
  return prisma.product.findMany({
    where: { active: true, ...where },
    include: {
      category: { select: { name: true, slug: true } },
      variants: { orderBy: { priceCents: 'asc' }, select: { id: true, priceCents: true, stock: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

type PrismaWhere = { categoryId?: string };

export function productBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      category: { select: { name: true, slug: true } },
      variants: { orderBy: { priceCents: 'asc' } },
    },
  });
}

export function categories() {
  return prisma.category.findMany({
    include: { _count: { select: { products: { where: { active: true } } } } },
    orderBy: { name: 'asc' },
  });
}

/** Cheapest in-stock variant drives the "from" price and the sold-out badge. */
export function leadVariant<T extends { priceCents: number; stock: number }>(variants: T[]) {
  const inStock = variants.filter((variant) => variant.stock > 0);
  const pool = inStock.length > 0 ? inStock : variants;
  return pool[0] ?? null;
}

export function totalStock(variants: { stock: number }[]) {
  return variants.reduce((sum, variant) => sum + variant.stock, 0);
}
