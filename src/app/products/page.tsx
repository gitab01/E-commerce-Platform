'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ProductGrid } from '@/components/products/product-grid'
import type { ProductWithCategory, PaginatedResponse } from '@/types'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
]

function ProductsContent() {
  const searchParams = useSearchParams()

  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([])
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [category, setCategory] = useState(searchParams.get('category') || '')
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest')
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)
  const [showFilters, setShowFilters] = useState(false)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (category) params.set('category', category)
    if (sort) params.set('sort', sort)
    if (searchParams.get('featured')) params.set('featured', 'true')
    params.set('page', page.toString())
    params.set('pageSize', '12')

    try {
      const res = await fetch(`/api/products?${params.toString()}`)
      const data: PaginatedResponse<ProductWithCategory> = await res.json()
      setProducts(data.data || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [search, category, sort, page, searchParams])

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => Array.isArray(data) ? setCategories(data) : setCategories([]))
      .catch(() => {})
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          {!loading && <p className="text-sm text-muted-foreground mt-0.5">{total} products found</p>}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="md:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </Button>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Sidebar */}
        <aside className={`w-full md:w-56 shrink-0 space-y-6 ${showFilters ? 'block' : 'hidden md:block'}`}>
          <form onSubmit={handleSearch}>
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
              rightIcon={
                search ? (
                  <button type="button" aria-label="Clear" onClick={() => { setSearch(''); setPage(1) }}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : undefined
              }
            />
          </form>

          <div className="space-y-2">
            <p className="text-sm font-medium">Sort by</p>
            <div className="space-y-1">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setSort(opt.value); setPage(1) }}
                  className={`w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    sort === opt.value ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {categories.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Category</p>
              <div className="space-y-1">
                <button
                  onClick={() => { setCategory(''); setPage(1) }}
                  className={`w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    !category ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground'
                  }`}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => { setCategory(cat.slug); setPage(1) }}
                    className={`w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      category === cat.slug ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Grid */}
        <div className="flex-1 space-y-6">
          <ProductGrid products={products} loading={loading} />
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                    page === p ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground'
                  }`}
                >
                  {p}
                </button>
              ))}
              <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="container py-16 text-center text-muted-foreground">Loading products...</div>}>
      <ProductsContent />
    </Suspense>
  )
}
