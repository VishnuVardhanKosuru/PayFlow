import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable PWA-friendly headers
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
    ];
  },
};

export default nextConfig;
