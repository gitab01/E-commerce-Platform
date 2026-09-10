'use client'

import { useState } from 'react'
import { ShoppingCart, Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/hooks/use-cart'
import type { Product } from '@prisma/client'

interface AddToCartButtonProps {
  product: Product
}

export function AddToCartButton({ product }: AddToCartButtonProps) {
  const { addItem } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  const handleAdd = () => {
    addItem({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0] || '',
      quantity,
      stock: product.stock,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  if (product.stock === 0) {
    return (
      <Button className="w-full" size="lg" disabled>
        Out of Stock
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center rounded-lg border border-border">
        <button
          onClick={() => setQuantity(Math.max(1, quantity - 1))}
          className="flex h-10 w-10 items-center justify-center hover:bg-accent transition-colors rounded-l-lg"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-12 text-center text-sm font-medium">{quantity}</span>
        <button
          onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
          className="flex h-10 w-10 items-center justify-center hover:bg-accent transition-colors rounded-r-lg"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <Button onClick={handleAdd} className="flex-1" size="lg">
        <ShoppingCart className="h-4 w-4" />
        {added ? 'Added to Cart!' : 'Add to Cart'}
      </Button>
    </div>
  )
}
