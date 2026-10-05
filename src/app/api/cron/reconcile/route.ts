import { NextResponse } from 'next/server';
import { reconcileStaleReservations } from '@/lib/fulfillment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Vercel Cron entry point (vercel.json). Releases stock held by abandoned
 * checkouts, and rescues any order that was actually paid but whose webhook
 * never arrived.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'reconciliation disabled' }, { status: 501 });
  }
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const report = await reconcileStaleReservations();
  return NextResponse.json({ ok: report.errors.length === 0, ...report });
}
