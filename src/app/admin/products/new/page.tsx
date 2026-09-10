import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ProductForm } from '@/components/products/product-form'
import prisma from '@/lib/prisma'

async function getCategories() {
  return prisma.category.findMany({ orderBy: { name: 'asc' } })
}

export default async function NewProductPage() {
  const categories = await getCategories()
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/products" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Products
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold">Add New Product</h1>
        <p className="text-sm text-muted-foreground mt-1">Fill in the details to create a new product listing.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-6">
        <ProductForm categories={categories} />
      </div>
    </div>
  )
}
