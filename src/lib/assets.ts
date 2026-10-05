import { createHash } from 'node:crypto';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

/**
 * Product art lives in Neon's S3-compatible bucket. Objects stay private: the
 * storefront reads them through /api/assets, which is the only place that
 * decides how a key is named, typed and cached.
 */
const EXT_BY_TYPE: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
const TYPE_BY_EXT: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const ASSET_PREFIX = 'products/';

/** Accepts exactly one flat key under ASSET_PREFIX — no traversal, no nested prefixes. */
const READABLE_KEY = /^products\/[A-Za-z0-9][A-Za-z0-9._-]{2,79}$/;

export function assetsConfigured() {
  return Boolean(
    process.env.AWS_ENDPOINT_URL_S3 &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.S3_BUCKET,
  );
}

export function isReadableKey(key: string) {
  return READABLE_KEY.test(key) && !key.includes('..');
}

export function contentTypeOfKey(key: string) {
  return TYPE_BY_EXT[key.slice(key.lastIndexOf('.') + 1).toLowerCase()] ?? null;
}

/**
 * Content-hashed so a URL can be served `immutable` and a re-upload of the same
 * bytes costs nothing. Old objects are left in place: an ISR render that is
 * still in the CDN cache may reference the previous key.
 */
export function imageKeyFor(slug: string, contentType: string, bytes: Uint8Array) {
  const ext = EXT_BY_TYPE[contentType];
  if (!ext) return null;
  const safeSlug = slug.replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
  if (!safeSlug) return null;
  const digest = createHash('sha1').update(bytes).digest('hex').slice(0, 12);
  return `${ASSET_PREFIX}${safeSlug}-${digest}.${ext}`;
}

let client: S3Client | null = null;

function bucketClient() {
  client ??= new S3Client({
    endpoint: process.env.AWS_ENDPOINT_URL_S3,
    region: process.env.AWS_REGION || 'us-east-2',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
    },
    // Neon hands out one endpoint per storage project and the bucket lives in the
    // path, not in a DNS name.
    forcePathStyle: true,
  });
  return client;
}

export async function putImage(key: string, bytes: Uint8Array, contentType: string) {
  await bucketClient().send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: bytes,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
}

export async function readImage(key: string): Promise<{ bytes: Uint8Array<ArrayBuffer>; contentType: string } | null> {
  if (!isReadableKey(key) || !assetsConfigured()) return null;
  const contentType = contentTypeOfKey(key);
  // Serve the type from the extension we chose, never from stored metadata: an
  // uploaded SVG must not become an inline script just because it was tagged so.
  if (!contentType) return null;

  try {
    const object = await bucketClient().send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
    const payload = await object.Body?.transformToByteArray();
    if (!payload) return null;
    const bytes = new Uint8Array(payload.byteLength);
    bytes.set(payload);
    return { bytes, contentType };
  } catch (error) {
    const name = (error as { name?: string; $metadata?: { httpStatusCode?: number } })?.name ?? '';
    const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
    if (name === 'NoSuchKey' || name === 'NotFound' || status === 404) return null;
    throw error;
  }
}
