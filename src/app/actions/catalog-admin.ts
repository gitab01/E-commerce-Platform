'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { guardAdmin, hashPassword } from '@/lib/auth';
import { revalidateProductSlug, slugify } from '@/lib/catalog';
import { toCents } from '@/lib/money';
import type { Role } from '@prisma/client';

export type AdminWrite = { ok: true; id?: string } | { ok: false; reason: string };

const productSchema = z.object({
  title: z.string().trim().min(3).max(120),
  handle: z.string().trim().max(80).optional(),
  description: z.string().trim().min(10).max(4000),
  image: z.string().trim().min(1).max(200),
  category: z.string().trim().min(2).max(60),
  active: z.boolean(),
});

const variantSchema = z.object({
  sku: z.string().trim().min(2).max(40),
  name: z.string().trim().min(1).max(60),
  /** Typed in whole Birr; converted to integer minor units below. */
  price: z.string().trim().min(1).max(16),
  stock: z.string().trim().regex(/^\d{1,7}$/),
});

const staffSchema = z.object({
  /** Same rules as public registration, so the account can sign in unchanged. */
  name: z.string().trim().min(2).max(120),
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
});

/** Only same-origin paths: next/image would otherwise be handed a remote URL. */
function isSafeImagePath(value: string): boolean {
  return value.startsWith('/') && !value.startsWith('//') && !value.includes('\\');
}

function cuid(value: unknown): string | null {
  return z.string().cuid().safeParse(String(value ?? '')).success ? String(value) : null;
}

export async function saveProduct(rawInput: unknown, rawId?: unknown): Promise<AdminWrite> {
  const admin = await guardAdmin();
  if (!admin) return { ok: false, reason: 'FORBIDDEN' };

  const parsed = productSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, reason: 'INVALID_INPUT' };
  const input = parsed.data;
  if (!isSafeImagePath(input.image)) return { ok: false, reason: 'BAD_IMAGE' };

  const id = rawId === undefined || rawId === '' ? null : cuid(rawId);
  if (rawId !== undefined && rawId !== '' && !id) return { ok: false, reason: 'INVALID_ID' };

  const slug = slugify(input.handle || input.title);
  if (!slug) return { ok: false, reason: 'INVALID_INPUT' };

  const taken = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
  if (taken && taken.id !== id) return { ok: false, reason: 'SLUG_TAKEN' };

  const categorySlug = slugify(input.category);
  if (!categorySlug) return { ok: false, reason: 'INVALID_INPUT' };
  const category = await prisma.category.upsert({
    where: { slug: categorySlug },
    create: { name: input.category, slug: categorySlug },
    update: {},
    select: { id: true },
  });

  const fields = {
    title: input.title,
    description: input.description,
    image: input.image,
    active: input.active,
    categoryId: category.id,
  };

  if (id) {
    const existing = await prisma.product.findUnique({ where: { id }, select: { slug: true } });
    if (!existing) return { ok: false, reason: 'NOT_FOUND' };
    const product = await prisma.product.update({ where: { id }, data: { ...fields, slug }, select: { id: true } });
    await audit(admin.email, 'product.update', slug, `${input.title} · ${input.active ? 'listed' : 'hidden'} · ${input.category}`);
    revalidateProductSlug(slug);
    if (existing.slug !== slug) revalidateProductSlug(existing.slug);
    revalidatePath('/admin/products');
    revalidatePath('/');
    return { ok: true, id: product.id };
  }

  const product = await prisma.product.create({ data: { ...fields, slug }, select: { id: true } });
  await audit(admin.email, 'product.create', slug, `${input.title} · ${input.category}`);
  revalidateProductSlug(slug);
  revalidatePath('/admin/products');
  revalidatePath('/');
  return { ok: true, id: product.id };
}

export async function deleteProduct(rawId: unknown): Promise<AdminWrite> {
  const admin = await guardAdmin();
  if (!admin) return { ok: false, reason: 'FORBIDDEN' };
  const id = cuid(rawId);
  if (!id) return { ok: false, reason: 'INVALID_ID' };

  const product = await prisma.product.findUnique({
    where: { id },
    select: { slug: true, title: true, variants: { select: { id: true } } },
  });
  if (!product) return { ok: false, reason: 'NOT_FOUND' };

  // Variants cascade from the product, but order_items point at them and must
  // not be orphaned, so anything with a sales history stays where it is.
  const sold = await prisma.orderItem.count({ where: { variantId: { in: product.variants.map((v) => v.id) } } });
  if (sold > 0) return { ok: false, reason: 'HAS_SALES' };

  await prisma.product.delete({ where: { id } });
  await audit(admin.email, 'product.delete', product.slug, `${product.title} · ${product.variants.length} variants`);
  revalidateProductSlug(product.slug);
  revalidatePath('/admin/products');
  revalidatePath('/');
  return { ok: true };
}

export async function saveVariant(productId: unknown, rawInput: unknown, rawId?: unknown): Promise<AdminWrite> {
  const admin = await guardAdmin();
  if (!admin) return { ok: false, reason: 'FORBIDDEN' };

  const id = cuid(productId);
  if (!id) return { ok: false, reason: 'INVALID_ID' };
  const variantId = rawId === undefined || rawId === '' ? null : cuid(rawId);
  if (rawId !== undefined && rawId !== '' && !variantId) return { ok: false, reason: 'INVALID_ID' };

  const parsed = variantSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, reason: 'INVALID_INPUT' };
  const input = parsed.data;

  const priceCents = toCents(input.price);
  if (priceCents === null || priceCents <= 0) return { ok: false, reason: 'BAD_PRICE' };

  const product = await prisma.product.findUnique({ where: { id }, select: { slug: true } });
  if (!product) return { ok: false, reason: 'NOT_FOUND' };

  const sku = input.sku.toUpperCase();
  const clash = await prisma.variant.findUnique({ where: { sku }, select: { id: true, productId: true } });
  if (clash && clash.id !== variantId) return { ok: false, reason: 'SKU_TAKEN' };

  const fields = { sku, name: input.name, priceCents, stock: Number.parseInt(input.stock, 10) };

  if (variantId) {
    const existing = await prisma.variant.findUnique({
      where: { id: variantId },
      select: { productId: true, sku: true, stock: true, priceCents: true },
    });
    if (!existing) return { ok: false, reason: 'NOT_FOUND' };
    if (existing.productId !== id) return { ok: false, reason: 'INVALID_ID' };
    const variant = await prisma.variant.update({ where: { id: variantId }, data: fields, select: { id: true } });
    await audit(
      admin.email,
      'variant.update',
      sku,
      `${input.name} · ${priceCents} vs ${existing.priceCents} · stock ${fields.stock} was ${existing.stock}`,
    );
    revalidateProductSlug(product.slug);
    revalidatePath('/admin/products');
    revalidatePath('/admin/inventory');
    return { ok: true, id: variant.id };
  }

  const variant = await prisma.variant.create({ data: { ...fields, productId: id }, select: { id: true } });
  await audit(admin.email, 'variant.create', sku, `${input.name} · ${priceCents} · stock ${fields.stock}`);
  revalidateProductSlug(product.slug);
  revalidatePath('/admin/products');
  revalidatePath('/admin/inventory');
  return { ok: true, id: variant.id };
}

export async function deleteVariant(rawId: unknown): Promise<AdminWrite> {
  const admin = await guardAdmin();
  if (!admin) return { ok: false, reason: 'FORBIDDEN' };
  const id = cuid(rawId);
  if (!id) return { ok: false, reason: 'INVALID_ID' };

  const variant = await prisma.variant.findUnique({
    where: { id },
    select: { sku: true, product: { select: { slug: true } } },
  });
  if (!variant) return { ok: false, reason: 'NOT_FOUND' };

  const sold = await prisma.orderItem.count({ where: { variantId: id } });
  if (sold > 0) return { ok: false, reason: 'HAS_SALES' };

  await prisma.variant.delete({ where: { id } });
  await audit(admin.email, 'variant.delete', variant.sku, `removed from ${variant.product.slug}`);
  revalidateProductSlug(variant.product.slug);
  revalidatePath('/admin/products');
  revalidatePath('/admin/inventory');
  return { ok: true };
}

export async function setCustomerRole(rawId: unknown, role: Role): Promise<AdminWrite> {
  const admin = await guardAdmin();
  if (!admin) return { ok: false, reason: 'FORBIDDEN' };
  const id = cuid(rawId);
  if (!id) return { ok: false, reason: 'INVALID_ID' };

  if (id === admin.id) return { ok: false, reason: 'SELF_CHANGE' };

  const target = await prisma.user.findUnique({ where: { id }, select: { email: true, role: true } });
  if (!target) return { ok: false, reason: 'NOT_FOUND' };
  if (target.role === role) return { ok: false, reason: 'UNCHANGED' };

  if (target.role === 'ADMIN') {
    const admins = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (admins <= 1) return { ok: false, reason: 'LAST_ADMIN' };
  }

  const user = await prisma.user.update({ where: { id }, data: { role }, select: { id: true } });
  await audit(admin.email, 'user.role', target.email, `${target.role} → ${role}`);
  revalidatePath('/admin/customers');
  revalidatePath(`/admin/customers/${id}`);
  return { ok: true, id: user.id };
}

export async function saveStaff(rawInput: unknown): Promise<AdminWrite> {
  const admin = await guardAdmin();
  if (!admin) return { ok: false, reason: 'FORBIDDEN' };

  const parsed = staffSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, reason: 'INVALID_INPUT' };
  const email = parsed.data.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email }, select: { role: true } });
  if (existing) return { ok: false, reason: existing.role === 'ADMIN' ? 'EMAIL_IS_ADMIN' : 'EMAIL_TAKEN' };

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash: hashPassword(parsed.data.password),
      role: 'ADMIN',
    },
    select: { id: true },
  });
  await audit(admin.email, 'user.create', email, 'ADMIN · created from the dashboard');
  revalidatePath('/admin/customers');
  return { ok: true, id: user.id };
}

export async function deleteCustomer(rawId: unknown): Promise<AdminWrite> {
  const admin = await guardAdmin();
  if (!admin) return { ok: false, reason: 'FORBIDDEN' };
  const id = cuid(rawId);
  if (!id) return { ok: false, reason: 'INVALID_ID' };
  if (id === admin.id) return { ok: false, reason: 'SELF_CHANGE' };

  const user = await prisma.user.findUnique({ where: { id }, select: { email: true, role: true } });
  if (!user) return { ok: false, reason: 'NOT_FOUND' };

  // Orders keep their email and address, so deleting an account with history
  // would silently turn paid orders into guest orders.
  const orders = await prisma.order.count({ where: { userId: id } });
  if (orders > 0) return { ok: false, reason: 'HAS_ORDERS' };

  await prisma.user.delete({ where: { id } });
  await audit(admin.email, 'user.delete', user.email, `${user.role} · no order history`);
  revalidatePath('/admin/customers');
  return { ok: true };
}

async function audit(actor: string, action: string, target: string, detail: string): Promise<void> {
  await prisma.auditLog.create({ data: { actor: `admin:${actor}`, action, target, detail } });
}
