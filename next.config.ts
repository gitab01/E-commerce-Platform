import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    // Product art is hand-authored local SVG under public/products.
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
  },
  typescript: {
    // A type error must never ship behind a green build.
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
