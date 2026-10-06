import Link from 'next/link';
import { prisma } from '@/lib/db';
import { ProductForm } from '@/components/product-form';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' }, select: { name: true } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/products" className="text-xs text-neutral-500 underline-offset-4 hover:underline">
          ← Products
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">New product</h1>
        <p className="mt-1 max-w-xl text-sm text-neutral-600">
          Create the product first, then add its variants and prices on the next screen. Until a variant exists the
          storefront shows it as sold out.
        </p>
      </div>
      <div className="max-w-2xl">
        <ProductForm
          draft={{ title: '', handle: '', description: '', image: '/products/', category: '', active: true }}
          categories={categories.map((category) => category.name)}
        />
      </div>
    </div>
  );
}
