import type { NextConfig } from 'next';
import { config } from 'dotenv';

config({ path: new URL('../../.env', import.meta.url).pathname });

const apiInternalUrl = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:3333';
const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55321');
const developmentScriptPolicy = process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'";
// Leaflet fetches map tiles as plain <img> elements straight from OpenStreetMap.
// Geocoding is not listed here: it is proxied by our API, so connect-src stays 'self'.
const tileHosts = 'https://tile.openstreetmap.org https://*.tile.openstreetmap.org';

const contentSecurityPolicy = `
  default-src 'self';
  base-uri 'self';
  object-src 'none';
  form-action 'self';
  script-src 'self' 'unsafe-inline'${developmentScriptPolicy} https://abacatepay.com https://www.abacatepay.com https://assets.abacatepay.com https://pkgs.rinne.com.br https://js.evervault.com;
  frame-src 'self' https://app.abacatepay.com https://ui-components.evervault.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: ${supabaseUrl.origin} ${tileHosts};
  media-src 'self' ${supabaseUrl.origin};
  connect-src 'self' https://api.abacatepay.com https://api.rinne.com.br https://api-sandbox.rinne.com.br https://t.rinne.com.br https://t-sandbox.rinne.com.br https://keys.evervault.com https://api.evervault.com;
  font-src 'self' data:;
  frame-ancestors 'self';
`;

const nextConfig: NextConfig = {
	// Image generation has a 120s provider deadline; avoid the proxy's default 30s cutoff.
	experimental: { proxyTimeout: 130_000 },
	transpilePackages: ['@events-manager/contracts'],
	images: {
		dangerouslyAllowSVG: false,
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
					{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
					{ key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=()' },
					{ key: 'X-Content-Type-Options', value: 'nosniff' },
					{ key: 'X-Frame-Options', value: 'SAMEORIGIN' },
				],
			},
		];
	},
};

export default nextConfig;
