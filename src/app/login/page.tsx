import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { AuthForm } from '@/components/auth-form';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await currentUser();
  const { next } = await searchParams;
  if (user) redirect(next ?? '/account');

  return (
    <div className="container-page max-w-sm py-14">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-neutral-600">Optional for buying; useful for order history and reordering.</p>
      <div className="mt-6">
        <Suspense fallback={null}>
          <AuthForm mode="login" />
        </Suspense>
      </div>
      <p className="mt-6 text-sm text-neutral-600">
        No account yet?{' '}
        <Link href="/register" className="underline-offset-4 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
