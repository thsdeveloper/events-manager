import type { NextConfig } from 'next';
import { config } from 'dotenv';

config({ path: new URL('../../.env', import.meta.url).pathname });

const apiInternalUrl = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:3333';
const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55321');

const contentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  frame-src 'self' https://app.abacatepay.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: ${supabaseUrl.origin};
  media-src 'self' ${supabaseUrl.origin};
  connect-src 'self' ${supabaseUrl.origin} https://api.abacatepay.com;
  font-src 'self' data:;
  frame-ancestors 'self';
`;

const nextConfig: NextConfig = {
  transpilePackages: ['@events-manager/contracts'],
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        protocol: supabaseUrl.protocol.replace(':', '') as 'http' | 'https',
        hostname: supabaseUrl.hostname,
        port: supabaseUrl.port,
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiInternalUrl}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy.replace(/\n/g, '').trim(),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
