'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { uploadProductImage } from '@/app/actions/assets';

const COPY: Record<string, string> = {
  FORBIDDEN: 'Not permitted.',
  NO_FILE: 'Choose a file first.',
  TOO_LARGE: 'Images must be 4 MB or smaller.',
  BAD_TYPE: 'PNG, JPEG or WebP only.',
  NOT_FOUND: 'Unknown product.',
  NOT_CONFIGURED: 'Object storage is not configured on this server.',
  INVALID_ID: 'Unknown product.',
};

export function ProductImageUpload({ productId }: { productId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      ref={formRef}
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const payload = new FormData(event.currentTarget);
        setMessage(null);
        startTransition(async () => {
          const response = await uploadProductImage(productId, payload);
          router.refresh();
          formRef.current?.reset();
          setMessage(response.ok ? 'Stored in object storage.' : COPY[response.reason] ?? 'Upload failed.');
        });
      }}
    >
      <input
        type="file"
        name="image"
        accept="image/png,image/jpeg,image/webp"
        className="w-full max-w-[13rem] text-xs text-neutral-600 file:mr-2 file:rounded-md file:border-0 file:bg-neutral-100 file:px-2.5 file:py-1 file:text-xs"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-neutral-300 px-3 py-1 text-sm text-neutral-900 hover:bg-neutral-100 disabled:opacity-50"
      >
        {pending ? 'Uploading…' : 'Upload'}
      </button>
      {message && <p role="status" className="w-full text-xs text-neutral-600 sm:w-auto">{message}</p>}
    </form>
  );
}
