import { readImage } from '@/lib/assets';

type Context = { params: Promise<{ key: string[] }> };

export async function GET(_request: Request, context: Context) {
  const { key } = await context.params;
  const image = await readImage(key.join('/'));
  if (!image) return new Response(null, { status: 404 });

  return new Response(image.bytes, {
    headers: {
      'Content-Type': image.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable, s-maxage=31536000',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
