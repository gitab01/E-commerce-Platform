import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@shegamarket.et' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@shegamarket.et',
      password: adminPassword,
      role: 'ADMIN',
    },
  })
  console.log('✅ Admin user:', admin.email)

  // Create test user
  const userPassword = await bcrypt.hash('User@123', 12)
  const user = await prisma.user.upsert({
    where: { email: 'user@shegamarket.et' },
    update: {},
    create: {
      name: 'Test User',
      email: 'user@shegamarket.et',
      password: userPassword,
      role: 'USER',
    },
  })
  console.log('✅ Test user:', user.email)

  // Create categories
  const categories = [
    { name: 'Electronics', slug: 'electronics', description: 'Gadgets, phones, computers and more' },
    { name: 'Fashion', slug: 'fashion', description: 'Clothing, shoes, and accessories' },
    { name: 'Home & Living', slug: 'home-living', description: 'Furniture, decor, and kitchen items' },
    { name: 'Beauty', slug: 'beauty', description: 'Skincare, makeup, and personal care' },
    { name: 'Sports', slug: 'sports', description: 'Sporting goods and fitness equipment' },
    { name: 'Books', slug: 'books', description: 'Books, stationery, and office supplies' },
  ]

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    })
  }
  console.log('✅ Categories created')

  const electronicsCategory = await prisma.category.findUnique({ where: { slug: 'electronics' } })
  const fashionCategory = await prisma.category.findUnique({ where: { slug: 'fashion' } })

  if (electronicsCategory && fashionCategory) {
    const products = [
      {
        name: 'Samsung Galaxy A54 5G',
        slug: 'samsung-galaxy-a54-5g',
        description: 'Feature-packed 5G smartphone with a 50MP camera, Super AMOLED display, and long battery life. Perfect for everyday use.',
        price: 45000,
        comparePrice: 52000,
        categoryId: electronicsCategory.id,
        stock: 25,
        sku: 'SAM-A54-5G',
        featured: true,
        images: ['https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600'],
        tags: ['smartphone', '5g', 'samsung'],
      },
      {
        name: 'Apple AirPods Pro',
        slug: 'apple-airpods-pro',
        description: 'Active Noise Cancellation, Transparency mode, Adaptive EQ, and up to 30 hours of battery life with charging case.',
        price: 28000,
        comparePrice: 32000,
        categoryId: electronicsCategory.id,
        stock: 15,
        sku: 'APP-AIRPODS-PRO',
        featured: true,
        images: ['https://images.unsplash.com/photo-1606741965509-e7a0b6be2ee6?w=600'],
        tags: ['earbuds', 'apple', 'wireless'],
      },
      {
        name: 'Habesha Traditional Dress',
        slug: 'habesha-traditional-dress',
        description: 'Authentic handwoven Habesha Kemis in premium cotton with intricate Tibeb border. Available in multiple colors.',
        price: 3500,
        comparePrice: 4200,
        categoryId: fashionCategory.id,
        stock: 40,
        sku: 'HAB-DRESS-001',
        featured: true,
        images: ['https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600'],
        tags: ['traditional', 'habesha', 'dress'],
      },
      {
        name: 'Laptop Stand Aluminum',
        slug: 'laptop-stand-aluminum',
        description: 'Ergonomic adjustable aluminum laptop stand with 6 height levels, compatible with all laptops 10-17 inches.',
        price: 1800,
        comparePrice: 2200,
        categoryId: electronicsCategory.id,
        stock: 50,
        sku: 'LAP-STAND-ALU',
        featured: false,
        images: ['https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600'],
        tags: ['laptop', 'stand', 'ergonomic'],
      },
    ]

    for (const product of products) {
      await prisma.product.upsert({
        where: { slug: product.slug },
        update: {},
        create: product,
      })
    }
    console.log('✅ Sample products created')
  }

  console.log('\n🎉 Database seeded successfully!')
  console.log('\nTest accounts:')
  console.log('  Admin: admin@shegamarket.et / Admin@123')
  console.log('  User:  user@shegamarket.et  / User@123')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
