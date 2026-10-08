import Image from 'next/image';
import { prisma } from '@/lib/db';
import { MAX_IMAGE_BYTES, assetsConfigured } from '@/lib/assets';
import { ProductImageUpload } from '@/components/product-image-upload';

export const dynamic = 'force-dynamic';

export default async function AdminAssetsPage() {
  const products = await prisma.product.findMany({
    orderBy: { title: 'asc' },
    select: { id: true, slug: true, title: true, image: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Product images</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Uploads are written to the Neon S3 bucket and served back through /api/assets, which decides the content type
          and the cache lifetime. PNG, JPEG and WebP up to {MAX_IMAGE_BYTES / 1024 / 1024} MB.
        </p>
        {!assetsConfigured() && (
          <p className="card mt-4 p-4 text-sm text-neutral-800">
            Object storage is not configured here. Set AWS_ENDPOINT_URL_S3, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and
            S3_BUCKET, then restart the server. Seeded local artwork stays in place until you do.
          </p>
        )}
      </section>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {products.map((product) => (
          <li key={product.id} className="card flex gap-4 p-4 transition-colors hover:border-neutral-400">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-line bg-white">
              <Image src={product.image} alt="" fill sizes="80px" className="object-contain p-1" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{product.title}</p>
              <p className="truncate font-mono text-xs text-neutral-500">{product.image}</p>
              <div className="mt-3">
                <ProductImageUpload productId={product.id} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
