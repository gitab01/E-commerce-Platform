import { describe, expect, it } from 'vitest';
import { slugify } from '@/lib/catalog';

describe('handles derived by the admin product form', () => {
  it('turns a title into a URL-safe slug', () => {
    expect(slugify('Wireless Headphones')).toBe('wireless-headphones');
    expect(slugify('  14" Laptop  ')).toBe('14-laptop');
  });

  it('never leaves a leading or trailing separator', () => {
    expect(slugify('---USB-C Dock!!!')).toBe('usb-c-dock');
    expect(slugify('Shega   Mart')).toBe('shega-mart');
    expect(slugify('')).toBe('');
    expect(slugify('   ')).toBe('');
  });

  it('gives nothing to slug on a name with no ASCII alphanumerics', () => {
    // The admin action turns an empty handle into INVALID_INPUT rather than
    // writing a product at /products/.
    expect(slugify('የቤት እቃዎች')).toBe('');
  });

  it('caps the length so a pasted title cannot make an unbounded path', () => {
    expect(slugify('a'.repeat(200))).toHaveLength(60);
  });
});
