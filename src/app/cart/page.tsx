import Link from 'next/link';
import { prisma } from '@/lib/db';
import { cartSessionId } from '@/lib/cart-session';
import { totalsFor, type CartLine } from '@/lib/checkout';
import { formatMoney } from '@/lib/money';
import { CartLines, type CartRow } from '@/components/cart-lines';
import { CheckoutPanel } from '@/components/checkout-panel';

export const dynamic = 'force-dynamic';

async function loadCart(): Promise<{ rows: CartRow[]; lines: CartLine[] }> {
  const sessionId = await cartSessionId();
  const cart = await prisma.cart.findUnique({
    where: { sessionId },
    include: {
      items: {
        include: {
          variant: {
            include: { product: { select: { title: true, active: true, image: true, slug: true } } },
          },
        },
        orderBy: { addedAt: 'asc' },
      },
    },
  });
  const rows: CartRow[] = (cart?.items ?? [])
    .filter((item) => item.variant.product.active)
    .map((item) => ({
      variantId: item.variant.id,
      sku: item.variant.sku,
      title: item.variant.product.title,
      variantName: item.variant.name,
      image: item.variant.product.image,
      quantity: item.quantity,
      unitPriceCents: item.variant.priceCents,
      stock: item.variant.stock,
    }));
  return { rows, lines: rows };
}

export default async function CartPage() {
  const { rows, lines } = await loadCart();
  const totals = totalsFor(lines);

  if (rows.length === 0) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Your cart is empty</h1>
        <p className="mt-2 text-sm text-neutral-600">Adding an item reserves nothing — stock is only held once you start checkout.</p>
        <Link href="/products" className="mt-6 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Cart</h1>
      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_20rem]">
        <div>
          <CartLines rows={rows} />
          <Link href="/products" className="mt-4 inline-block text-sm text-neutral-600 underline-offset-4 hover:underline">
            Continue shopping
          </Link>
        </div>
        <CheckoutPanel
          totals={{ subtotalCents: totals.subtotalCents, shippingCents: totals.shippingCents, totalCents: totals.totalCents }}
        />
      </div>
    </div>
  );
}
