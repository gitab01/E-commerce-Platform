'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { MAX_IMAGE_BYTES, assetsConfigured, imageKeyFor, putImage } from '@/lib/assets';
import { revalidateProductSlug } from '@/lib/catalog';

export type UploadResult = { ok: true } | { ok: false; reason: string };

export async function uploadProductImage(rawProductId: unknown, form: FormData): Promise<UploadResult> {
  const user = await currentUser();
  if (!user || user.role !== 'ADMIN') return { ok: false, reason: 'FORBIDDEN' };
  if (!assetsConfigured()) return { ok: false, reason: 'NOT_CONFIGURED' };

  const productId = z.string().cuid().safeParse(String(rawProductId ?? ''));
  if (!productId.success) return { ok: false, reason: 'INVALID_ID' };

  const file = form.get('image');
  if (!(file instanceof File) || file.size === 0) return { ok: false, reason: 'NO_FILE' };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, reason: 'TOO_LARGE' };

  const product = await prisma.product.findUnique({ where: { id: productId.data }, select: { slug: true } });
  if (!product) return { ok: false, reason: 'NOT_FOUND' };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const key = imageKeyFor(product.slug, file.type, bytes);
  if (!key) return { ok: false, reason: 'BAD_TYPE' };

  await putImage(key, bytes, file.type);
  await prisma.product.update({
    where: { id: productId.data },
    data: { image: `/api/assets/${key}` },
  });
  await prisma.auditLog.create({
    data: {
      actor: `admin:${user.email}`,
      action: 'product.image',
      target: product.slug,
      detail: `${key} · ${file.size} bytes`,
    },
  });

  revalidateProductSlug(product.slug);
  revalidatePath('/admin/assets');
  return { ok: true };
}
