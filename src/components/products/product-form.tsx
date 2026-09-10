'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input, Textarea, Select } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { slugify } from '@/lib/utils'
import type { ProductWithCategory } from '@/types'

interface ProductFormProps {
  product?: ProductWithCategory
  categories: { id: string; name: string }[]
}

export function ProductForm({ product, categories }: ProductFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: product?.name || '',
    slug: product?.slug || '',
    description: product?.description || '',
    price: product?.price?.toString() || '',
    comparePrice: product?.comparePrice?.toString() || '',
    categoryId: product?.categoryId || '',
    stock: product?.stock?.toString() || '0',
    sku: product?.sku || '',
    featured: product?.featured || false,
    published: product?.published ?? true,
    images: product?.images?.join('\n') || '',
    tags: product?.tags?.join(', ') || '',
  })

  const handleChange = (field: string, value: string | boolean) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value }
      if (field === 'name' && !product) {
        updated.slug = slugify(value as string)
      }
      return updated
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const payload = {
      ...form,
      price: parseFloat(form.price),
      comparePrice: form.comparePrice ? parseFloat(form.comparePrice) : null,
      stock: parseInt(form.stock),
      images: form.images.split('\n').map((s) => s.trim()).filter(Boolean),
      tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean),
    }

    try {
      const url = product ? `/api/products/${product.id}` : '/api/products'
      const method = product ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save product')
      }

      router.push('/admin/products')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }))

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input
            label="Product Name"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            required
          />
        </div>
        <Input
          label="Slug"
          value={form.slug}
          onChange={(e) => handleChange('slug', e.target.value)}
          helperText="URL-friendly identifier"
          required
        />
        <Input
          label="SKU"
          value={form.sku}
          onChange={(e) => handleChange('sku', e.target.value)}
          placeholder="Optional"
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={4}
            required
          />
        </div>
        <Input
          label="Price (ETB)"
          type="number"
          min="0"
          step="0.01"
          value={form.price}
          onChange={(e) => handleChange('price', e.target.value)}
          required
        />
        <Input
          label="Compare Price (ETB)"
          type="number"
          min="0"
          step="0.01"
          value={form.comparePrice}
          onChange={(e) => handleChange('comparePrice', e.target.value)}
          helperText="Original price for discount display"
        />
        <Select
          label="Category"
          value={form.categoryId}
          onChange={(e) => handleChange('categoryId', e.target.value)}
          options={categoryOptions}
          placeholder="Select category"
          required
        />
        <Input
          label="Stock"
          type="number"
          min="0"
          value={form.stock}
          onChange={(e) => handleChange('stock', e.target.value)}
          required
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Image URLs"
            value={form.images}
            onChange={(e) => handleChange('images', e.target.value)}
            helperText="One URL per line"
            rows={3}
          />
        </div>
        <div className="sm:col-span-2">
          <Input
            label="Tags"
            value={form.tags}
            onChange={(e) => handleChange('tags', e.target.value)}
            helperText="Comma-separated tags"
          />
        </div>
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => handleChange('featured', e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          <span className="text-sm font-medium">Featured product</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => handleChange('published', e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          <span className="text-sm font-medium">Published</span>
        </label>
      </div>

      <div className="flex gap-3">
        <Button type="submit" loading={loading}>
          {product ? 'Update Product' : 'Create Product'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
