'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart, Star, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatPrice, calculateDiscount } from '@/lib/utils'
import { useCart } from '@/hooks/use-cart'
import type { ProductWithCategory } from '@/types'

interface ProductCardProps {
  product: ProductWithCategory
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart()
  const discount = calculateDiscount(product.price, product.comparePrice)
  const isOutOfStock = product.stock === 0

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    if (isOutOfStock) return
    addItem({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0] || '',
      quantity: 1,
      stock: product.stock,
    })
  }

  const rating = product.averageRating || 0
  const reviewCount = product._count?.reviews || 0

  return (
    <Link href={`/products/${product.id}`} className="group block">
      <div className="rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          <Image
            src={product.images[0] || 'https://via.placeholder.com/400x400?text=Product'}
            alt={product.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {product.featured && (
              <Badge variant="default" className="text-[10px]">Featured</Badge>
            )}
            {discount > 0 && (
              <Badge variant="destructive" className="text-[10px]">-{discount}%</Badge>
            )}
            {isOutOfStock && (
              <Badge variant="secondary" className="text-[10px]">Out of Stock</Badge>
            )}
          </div>
          {/* Wishlist */}
          <button
            className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur opacity-0 group-hover:opacity-100 transition-all hover:bg-background"
            aria-label="Add to wishlist"
            onClick={(e) => e.preventDefault()}
          >
            <Heart className="h-4 w-4" />
          </button>
        </div>

        {/* Info */}
        <div className="p-4 space-y-2">
          <p className="text-xs text-muted-foreground">{product.category?.name}</p>
          <h3 className="text-sm font-semibold leading-tight line-clamp-2">{product.name}</h3>

          {/* Rating */}
          {reviewCount > 0 && (
            <div className="flex items-center gap-1">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-3 w-3 ${star <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">({reviewCount})</span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-base">{formatPrice(product.price)}</span>
            {product.comparePrice && product.comparePrice > product.price && (
              <span className="text-xs text-muted-foreground line-through">{formatPrice(product.comparePrice)}</span>
            )}
          </div>

          {/* Stock indicator */}
          {product.stock > 0 && product.stock <= 10 && (
            <p className="text-xs text-orange-600">Only {product.stock} left</p>
          )}

          <Button
            size="sm"
            className="w-full"
            disabled={isOutOfStock}
            onClick={handleAddToCart}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </Button>
        </div>
      </div>
    </Link>
  )
}
