import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes, scryptSync } from 'node:crypto';

const prisma = new PrismaClient();

/** Same derivation as src/lib/auth.ts so seeded accounts can sign in. */
function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${derived.toString('base64')}`;
}

const CATALOGUE = [
  {
    slug: 'wireless-headphones',
    title: 'Wireless Headphones',
    image: '/products/headphones.svg',
    category: 'Audio',
    description:
      'Closed-back over-ear headphones with a 32-hour battery, adaptive noise reduction and a USB-C quick charge. Two fits, one driver.',
    variants: [
      { sku: 'HPH-BLK-M', name: 'Black / Medium', priceCents: 120_000, stock: 12 },
      { sku: 'HPH-BLK-L', name: 'Black / Large', priceCents: 124_000, stock: 6 },
      { sku: 'HPH-SAN-M', name: 'Sand / Medium', priceCents: 120_000, stock: 0 },
    ],
  },
  {
    slug: 'mechanical-keyboard',
    title: 'Mechanical Keyboard',
    image: '/products/keyboard.svg',
    category: 'Accessories',
    description:
      'Hot-swappable 75% board with a gasket mount, south-facing RGB and a weighted aluminium case. Wired or 2.4 GHz.',
    variants: [
      { sku: 'KBD-TAC-75', name: 'Tactile', priceCents: 98_000, stock: 9 },
      { sku: 'KBD-LIN-75', name: 'Linear', priceCents: 98_000, stock: 2 },
    ],
  },
  {
    slug: 'studio-monitor-speakers',
    title: 'Studio Monitor Speakers',
    image: '/products/speakers.svg',
    category: 'Audio',
    description:
      'Pair of 5-inch bi-amped nearfield monitors with a rear acoustic adjustment and balanced XLR/TRS inputs.',
    variants: [
      { sku: 'SPK-5P-PAIR', name: '5" pair', priceCents: 275_000, stock: 3 },
      { sku: 'SPK-8P-PAIR', name: '8" pair', priceCents: 420_000, stock: 1 },
    ],
  },
  {
    slug: '14-laptop',
    title: '14" Laptop',
    image: '/products/laptop.svg',
    category: 'Computers',
    description:
      'Thin-and-light with a 14-core CPU, 16 GB unified memory and a colour-calibrated display. Ships with a 65 W charger.',
    variants: [
      { sku: 'LAP-14-16-512', name: '16 GB / 512 GB', priceCents: 1_180_000, stock: 4 },
      { sku: 'LAP-14-32-1TB', name: '32 GB / 1 TB', priceCents: 1_540_000, stock: 1 },
    ],
  },
  {
    slug: 'usb-c-dock',
    title: 'USB-C Dock',
    image: '/products/dock.svg',
    category: 'Accessories',
    description:
      '11-in-one dock with dual display output, gigabit ethernet, SD readers and 96 W passthrough charging.',
    variants: [{ sku: 'DOCK-11P', name: '11-port', priceCents: 64_000, stock: 15 }],
  },
  {
    slug: 'webcam-4k',
    title: '4K Webcam',
    image: '/products/webcam.svg',
    category: 'Computers',
    description:
      'Auto-framing 4K sensor with dual omnidirectional microphones and a physical shutter. UVC, no drivers.',
    variants: [
      { sku: 'CAM-4K-BLK', name: 'Black', priceCents: 72_000, stock: 7 },
      { sku: 'CAM-4K-WHT', name: 'White', priceCents: 72_000, stock: 0 },
    ],
  },
  {
    slug: 'laptop-sleeve',
    title: 'Laptop Sleeve',
    image: '/products/sleeve.svg',
    category: 'Accessories',
    description:
      'Dense felt shell with a brushed lining and a leather-pull zipper, sized so the lid never touches the walls. Fits a 14" or 16" machine flat.',
    variants: [
      { sku: 'SLV-14-CHR', name: '14" / Charcoal', priceCents: 89_000, stock: 18 },
      { sku: 'SLV-16-CHR', name: '16" / Charcoal', priceCents: 99_000, stock: 7 },
    ],
  },
  {
    slug: 'gan-charger-65w',
    title: '65W GaN Charger',
    image: '/products/charger.svg',
    category: 'Accessories',
    description:
      'Single USB-C port delivering 65 W over PD 3.0, enough to charge a laptop from empty overnight. GaN switching keeps it pocket-sized and cool.',
    variants: [
      { sku: 'CHG-65-US', name: 'US plug', priceCents: 165_000, stock: 11 },
      { sku: 'CHG-65-EU', name: 'EU plug', priceCents: 165_000, stock: 0 },
    ],
  },
  {
    slug: 'wireless-mouse',
    title: 'Wireless Ergonomic Mouse',
    image: '/products/mouse.svg',
    category: 'Accessories',
    description:
      'Sculpted right-hand shell with a scroll wheel that free-spins, six programmable buttons and a silent click. Bluetooth or 2.4 GHz dongle.',
    variants: [
      { sku: 'MSE-ERG-BLK', name: 'Graphite', priceCents: 99_000, stock: 8 },
      { sku: 'MSE-ERG-SLV', name: 'Silver', priceCents: 99_000, stock: 4 },
    ],
  },
  {
    slug: 'monitor-27-4k',
    title: '27" 4K Monitor',
    image: '/products/monitor.svg',
    category: 'Computers',
    description:
      'Flat 27-inch IPS panel at 3840 x 2160 with 99% sRGB from the factory, a 90 W USB-C input that charges the laptop it drives, and a stand that lifts, tilts and turns to portrait.',
    variants: [
      { sku: 'MON-27-4K-STD', name: 'Standard', priceCents: 980_000, stock: 5 },
      { sku: 'MON-27-4K-HDR', name: 'HDR 600', priceCents: 1_240_000, stock: 0 },
    ],
  },
  {
    slug: 'portable-ssd',
    title: 'Portable NVMe SSD',
    image: '/products/ssd.svg',
    category: 'Accessories',
    description:
      'Pocket drive that holds a full video project and moves it in seconds over USB 3.2 Gen 2. Aluminium shell doubles as the heatsink, and it is drop-rated to two metres.',
    variants: [
      { sku: 'SSD-NV-1TB', name: '1 TB', priceCents: 420_000, stock: 14 },
      { sku: 'SSD-NV-2TB', name: '2 TB', priceCents: 760_000, stock: 6 },
    ],
  },
  {
    slug: 'noise-cancelling-earbuds',
    title: 'Noise-Cancelling Earbuds',
    image: '/products/earbuds.svg',
    category: 'Audio',
    description:
      'In-ear cancelling that flattens a bus engine, eight hours per charge and a case that adds three more. Pair of four tip sizes keeps the seal without pressure.',
    variants: [
      { sku: 'EBD-NC-WHT', name: 'Ivory', priceCents: 145_000, stock: 21 },
      { sku: 'EBD-NC-BLK', name: 'Graphite', priceCents: 145_000, stock: 9 },
    ],
  },
];

async function main() {
  const categoryNames = [...new Set(CATALOGUE.map((product) => product.category))];
  const categories = new Map<string, string>();
  for (const name of categoryNames) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const category = await prisma.category.upsert({
      where: { slug },
      create: { name, slug },
      update: { name },
    });
    categories.set(name, category.id);
  }

  for (const product of CATALOGUE) {
    const record = await prisma.product.upsert({
      where: { slug: product.slug },
      create: {
        slug: product.slug,
        title: product.title,
        description: product.description,
        image: product.image,
        categoryId: categories.get(product.category)!,
        active: true,
      },
      update: {
        title: product.title,
        description: product.description,
        image: product.image,
        categoryId: categories.get(product.category)!,
        active: true,
      },
    });

    for (const variant of product.variants) {
      await prisma.variant.upsert({
        where: { sku: variant.sku },
        create: { ...variant, productId: record.id },
        update: { name: variant.name, priceCents: variant.priceCents, stock: variant.stock },
      });
    }
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'change-me-please';
  await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      name: 'Store admin',
      role: 'ADMIN',
      passwordHash: hashPassword(adminPassword),
    },
    update: { role: 'ADMIN' },
  });

  const demoEmail = 'shopper@example.com';
  await prisma.user.upsert({
    where: { email: demoEmail },
    create: { email: demoEmail, name: 'Sample shopper', passwordHash: hashPassword('shopper-1234') },
    update: {},
  });

  const counts = await Promise.all([
    prisma.product.count(),
    prisma.variant.count(),
    prisma.user.count(),
    prisma.order.count(),
  ]);
  console.log(`seeded: ${counts[0]} products, ${counts[1]} variants, ${counts[2]} users, ${counts[3]} orders`);
  console.log(`admin login: ${adminEmail} (hash ${createHash('sha256').update(adminPassword).digest('hex').slice(0, 8)}…)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
