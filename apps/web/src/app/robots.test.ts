import { beforeEach, describe, expect, it, vi } from 'vitest';
import robots from './robots';

vi.mock('@/lib/backend', () => ({
	backendFetch: vi.fn(),
	isNotFound: () => false,
}));

const { backendFetch } = await import('@/lib/backend');

describe('robots', () => {
	beforeEach(() => {
		vi.mocked(backendFetch).mockResolvedValue({ globals: { id: 'g', url: 'https://site.example' } } as never);
	});

	it('allows crawling the public site but keeps private and administrative areas out', async () => {
		const result = await robots();

		expect(result.rules).toEqual([
			{
				userAgent: '*',
				allow: '/',
				disallow: ['/admin', '/super-admin', '/perfil', '/api/', '/login', '/my-registrations', '/examples'],
			},
		]);
	});

	it('points crawlers to the sitemap on the public site URL', async () => {
		const result = await robots();

		expect(result.sitemap).toBe('https://site.example/sitemap.xml');
		expect(result.host).toBe('https://site.example');
	});
});
