import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Star, ShieldCheck, Truck, ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { AddToCartButton } from '@/components/products/add-to-cart-button'
import { formatPrice } from '@/lib/utils'
import prisma from '@/lib/prisma'

interface Props {
  params: { id: string }
}

async function getProduct(id: string) {
  try {
    return await prisma.product.findUnique({
      where: { id, published: true },
      include: {
        category: true,
        reviews: { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
        _count: { select: { reviews: true } },
      },
    })
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props) {
  const product = await getProduct(params.id)
  if (!product) return { title: 'Product Not Found' }
  return { title: product.name, description: product.description.substring(0, 160) }
}

export default async function ProductPage({ params }: Props) {
  const product = await getProduct(params.id)
  if (!product) notFound()

  const avgRating =
    product.reviews.length > 0
      ? product.reviews.reduce((a, r) => a + r.rating, 0) / product.reviews.length
      : 0

  const discount = product.comparePrice && product.comparePrice > product.price
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0

  return (
    <div className="container py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-foreground">Products</Link>
        <span>/</span>
        <Link href={`/products?category=${product.category.slug}`} className="hover:text-foreground">
          {product.category.name}
        </Link>
        <span>/</span>
        <span className="text-foreground line-clamp-1">{product.name}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Images */}
        <div className="space-y-3">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
            <Image
              src={product.images[0] || 'https://via.placeholder.com/600x600?text=Product'}
              alt={product.name}
              fill
              className="object-cover"
              priority
            />
            {discount > 0 && (
              <div className="absolute top-4 left-4">
                <Badge variant="destructive">-{discount}%</Badge>
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {product.images.map((img, i) => (
                <div key={i} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted border border-border">
                  <Image src={img} alt={`${product.name} ${i + 1}`} fill className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-5">
          <div>
            <Link href={`/products?category=${product.category.slug}`}>
              <Badge variant="outline">{product.category.name}</Badge>
            </Link>
            <h1 className="mt-2 text-2xl font-bold leading-tight">{product.name}</h1>

            {/* Rating */}
            {product._count.reviews > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-4 w-4 ${s <= Math.round(avgRating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {avgRating.toFixed(1)} ({product._count.reviews} reviews)
                </span>
              </div>
            )}
          </div>

          {/* Price */}
          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold">{formatPrice(product.price)}</span>
            {product.comparePrice && product.comparePrice > product.price && (
              <span className="text-lg text-muted-foreground line-through mb-0.5">
                {formatPrice(product.comparePrice)}
              </span>
            )}
          </div>

          {/* Stock */}
          <div>
            {product.stock === 0 ? (
              <Badge variant="destructive">Out of Stock</Badge>
            ) : product.stock <= 10 ? (
              <Badge variant="warning">Only {product.stock} left in stock</Badge>
            ) : (
              <Badge variant="success">In Stock</Badge>
            )}
          </div>

          {/* Description */}
          <p className="text-muted-foreground leading-relaxed text-sm">{product.description}</p>

          {/* Add to Cart */}
          <AddToCartButton product={product} />

          {/* Trust badges */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
              <Truck className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs font-medium">Free Delivery</p>
                <p className="text-[10px] text-muted-foreground">Orders over ETB 2,000</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs font-medium">Secure Payment</p>
                <p className="text-[10px] text-muted-foreground">All Ethiopian banks</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews */}
      {product.reviews.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-4">Customer Reviews</h2>
          <div className="space-y-4">
            {product.reviews.map((review) => (
              <div key={review.id} className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium">{review.user.name || 'Anonymous'}</p>
                    <div className="flex mt-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-3 w-3 ${s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
