'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveProduct } from '@/app/actions/catalog-admin';

const COPY: Record<string, string> = {
  FORBIDDEN: 'Not permitted.',
  INVALID_INPUT: 'Title, description, image path and category are all required.',
  INVALID_ID: 'That product no longer exists.',
  NOT_FOUND: 'That product no longer exists.',
  SLUG_TAKEN: 'Another product already uses that URL handle.',
  BAD_IMAGE: 'The image must be a path on this site, like /products/keyboard.svg.',
};

export type ProductDraft = {
  id?: string;
  title: string;
  handle: string;
  description: string;
  image: string;
  category: string;
  active: boolean;
};

export function ProductForm({ draft, categories }: { draft: ProductDraft; categories: string[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const isEdit = Boolean(draft.id);

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const input = {
          title: String(form.get('title') ?? ''),
          handle: String(form.get('handle') ?? ''),
          description: String(form.get('description') ?? ''),
          image: String(form.get('image') ?? ''),
          category: String(form.get('category') ?? ''),
          active: form.get('active') === 'on',
        };
        setMessage(null);
        startTransition(async () => {
          const result = await saveProduct(input, draft.id ?? '');
          if (result.ok) {
            if (isEdit) {
              setMessage('Saved.');
              router.refresh();
            } else {
              router.push(`/admin/products/${result.id}`);
            }
            return;
          }
          setMessage(COPY[result.reason] ?? 'Failed.');
        });
      }}
    >
      <Field label="Title">
        <input
          name="title"
          defaultValue={draft.title}
          required
          minLength={3}
          maxLength={120}
          placeholder="Wireless Headphones"
          className="field"
        />
      </Field>

      <Field label="URL handle" hint="Leave empty to derive it from the title.">
        <input
          name="handle"
          defaultValue={draft.handle}
          maxLength={80}
          placeholder="wireless-headphones"
          className="field font-mono"
        />
      </Field>

      <Field label="Category" hint="Pick an existing one or type a new name.">
        <input
          name="category"
          defaultValue={draft.category}
          required
          minLength={2}
          maxLength={60}
          list="admin-categories"
          placeholder="Audio"
          className="field"
        />
        <datalist id="admin-categories">
          {categories.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </Field>

      <Field label="Image path" hint="Uploads live on the Images page; this is the path the storefront renders.">
        <input
          name="image"
          defaultValue={draft.image}
          required
          maxLength={200}
          placeholder="/products/headphones.svg"
          className="field font-mono"
        />
      </Field>

      <Field label="Description">
        <textarea
          name="description"
          defaultValue={draft.description}
          required
          minLength={10}
          rows={5}
          className="field leading-relaxed"
        />
      </Field>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={draft.active} className="mt-0.5 size-4" />
        <span>
          <span className="font-medium">Listed</span>
          <span className="block text-xs text-neutral-500">
            Hidden products stay in order history and stop appearing in the catalogue.
          </span>
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
        </button>
        {message && (
          <p role="status" className="text-sm text-neutral-600">
            {message}
          </p>
        )}
      </div>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-neutral-900">{label}</span>
      {children}
      {hint && <span className="text-xs text-neutral-500">{hint}</span>}
    </div>
  );
}
