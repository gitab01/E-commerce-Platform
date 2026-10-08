import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AdminNav } from '@/components/admin-nav';
import { currentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect('/login?next=/admin');
  if (user.role !== 'ADMIN') {
    return (
      <div className="container-page max-w-lg py-20 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Admin access only</h1>
        <p className="mt-2 text-sm text-neutral-600">
          The signed-in account does not carry the ADMIN role. Route access and the role check in the database both
          have to pass.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm underline-offset-4 hover:underline">
          Back to the storefront
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <AdminNav email={user.email} />
      <div className="mt-8">{children}</div>
    </div>
  );
}
