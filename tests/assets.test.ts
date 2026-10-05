import { describe, expect, it } from 'vitest';
import { contentTypeOfKey, imageKeyFor, isReadableKey } from '@/lib/assets';

const bytes = (seed: number) => Uint8Array.from([0x89, 0x50, 0x4e, 0x47, seed]);

describe('asset keys', () => {
  it('names an upload by slug and content hash', () => {
    const first = imageKeyFor('wireless-headphones', 'image/png', bytes(1));
    const again = imageKeyFor('wireless-headphones', 'image/png', bytes(1));
    const other = imageKeyFor('wireless-headphones', 'image/png', bytes(2));

    expect(first).toMatch(/^products\/wireless-headphones-[0-9a-f]{12}\.png$/);
    // Same bytes, same key: a re-upload is a no-op and the URL stays cacheable.
    expect(again).toBe(first);
    expect(other).not.toBe(first);
  });

  it('refuses types that cannot be rendered as an image tag', () => {
    expect(imageKeyFor('dock', 'image/svg+xml', bytes(1))).toBeNull();
    expect(imageKeyFor('dock', 'text/html', bytes(1))).toBeNull();
    expect(imageKeyFor('', 'image/png', bytes(1))).toBeNull();
  });

  it('flattens anything unsafe in the slug', () => {
    expect(imageKeyFor('../../etc/passwd', 'image/jpeg', bytes(1))).toMatch(/^products\/etc-passwd-[0-9a-f]{12}\.jpg$/);
  });
});

describe('isReadableKey', () => {
  const cases: [string, boolean][] = [
    ['products/headphones-abc123.png', true],
    ['products/a-b.webp', true],
    ['products/../secret.png', false],
    ['products/nested/deep.png', false],
    ['secrets/token.png', false],
    ['products/.hidden.png', false],
    ['products/x', false],
    ['products/x.png\n', false],
  ];

  it.each(cases)('%s -> %s', (key, expected) => {
    expect(isReadableKey(key)).toBe(expected);
  });

  it('maps only the extensions we hand out', () => {
    expect(contentTypeOfKey('products/a.png')).toBe('image/png');
    expect(contentTypeOfKey('products/a.svg')).toBeNull();
    expect(contentTypeOfKey('products/a.html')).toBeNull();
  });
});
