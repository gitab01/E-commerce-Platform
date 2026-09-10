import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { slugify } from '@/lib/utils'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const sort = searchParams.get('sort') || 'newest'
    const featured = searchParams.get('featured') === 'true'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(48, parseInt(searchParams.get('pageSize') || '12'))

    const where: any = { published: true }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ]
    }

    if (category) {
      where.category = { slug: category }
    }

    if (featured) where.featured = true

    const orderBy: any =
      sort === 'price_asc' ? { price: 'asc' } :
      sort === 'price_desc' ? { price: 'desc' } :
      { createdAt: 'desc' }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          _count: { select: { reviews: true } },
          reviews: { select: { rating: true } },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ])

    const enriched = products.map((p) => ({
      ...p,
      averageRating:
        p.reviews.length > 0
          ? p.reviews.reduce((a, r) => a + r.rating, 0) / p.reviews.length
          : 0,
    }))

    return NextResponse.json({
      data: enriched,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('Products GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, description, price, comparePrice, categoryId, stock, sku, featured, published, images, tags, slug } = body

    if (!name || !description || !price || !categoryId) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 })
    }

    const finalSlug = slug || slugify(name)
    const existing = await prisma.product.findUnique({ where: { slug: finalSlug } })
    const uniqueSlug = existing ? `${finalSlug}-${Date.now()}` : finalSlug

    const product = await prisma.product.create({
      data: {
        name,
        slug: uniqueSlug,
        description,
        price: parseFloat(price),
        comparePrice: comparePrice ? parseFloat(comparePrice) : null,
        categoryId,
        stock: parseInt(stock) || 0,
        sku: sku || null,
        featured: featured || false,
        published: published ?? true,
        images: images || [],
        tags: tags || [],
      },
      include: { category: true },
    })

    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    console.error('Products POST error:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
