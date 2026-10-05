import { signOut } from '@/app/actions/account';

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-800 hover:bg-neutral-100"
      >
        Sign out
      </button>
    </form>
  );
}
