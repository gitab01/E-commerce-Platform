import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { AuthForm } from '@/components/auth-form';

export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  if (await currentUser()) redirect('/account');

  return (
    <div className="container-page max-w-sm py-14">
      <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
      <p className="mt-1 text-sm text-neutral-600">Guest checkout stays available — this only adds history and reorder.</p>
      <div className="mt-6">
        <AuthForm mode="register" />
      </div>
      <p className="mt-6 text-sm text-neutral-600">
        Already registered?{' '}
        <Link href="/login" className="underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
