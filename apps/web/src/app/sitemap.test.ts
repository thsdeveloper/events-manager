import { beforeEach, describe, expect, it, vi } from 'vitest';
import sitemap from './sitemap';

vi.mock('@/lib/backend', () => ({
	backendFetch: vi.fn(),
	isNotFound: () => false,
}));

const { backendFetch } = await import('@/lib/backend');

const sitemapPayload = {
	pages: [
		{
			permalink: '/',
			published_at: '2026-09-01T00:00:00.000Z',
			date_updated: '2026-09-04T00:00:00.000Z',
			change_frequency: 'daily',
			priority: '1',
		},
		{
			permalink: '/sobre',
			published_at: '2026-09-01T00:00:00.000Z',
			date_updated: null,
			change_frequency: null,
			priority: null,
		},
	],
	posts: [
		{
			slug: 'bem-vindo',
			published_at: '2026-09-02T00:00:00.000Z',
			date_updated: '2026-09-03T00:00:00.000Z',
			change_frequency: 'monthly',
			priority: '0.6',
		},
	],
	events: [{ slug: 'evento-demo', start_date: '2026-10-04T00:00:00.000Z', date_updated: '2026-09-04T12:00:00.000Z' }],
};

function respondByPath(overrides: Record<string, () => unknown> = {}) {
	vi.mocked(backendFetch).mockImplementation(async (path: string) => {
		const routes: Record<string, () => unknown> = {
			'/api/content/site': () => ({ globals: { id: 'g', url: 'https://site.example/' } }),
			'/api/content/sitemap': () => sitemapPayload,
			...overrides,
		};
		const handler = routes[path];
		if (!handler) throw new Error(`Rota inesperada: ${path}`);

		return handler() as never;
	});
}

describe('sitemap', () => {
	beforeEach(() => {
		respondByPath();
	});

	it('lists CMS pages with the frequency and priority chosen in the editor, dated by the last update', async () => {
		const entries = await sitemap();

		expect(entries).toContainEqual({
			url: 'https://site.example/',
			lastModified: '2026-09-04T00:00:00.000Z',
			changeFrequency: 'daily',
			priority: 1,
		});
		expect(entries).toContainEqual({
			url: 'https://site.example/sobre',
			lastModified: '2026-09-01T00:00:00.000Z',
			changeFrequency: 'weekly',
			priority: 0.7,
		});
	});

	it('includes posts, events and the blog and events indexes', async () => {
		const entries = await sitemap();
		const urls = entries.map((entry) => entry.url);

		expect(urls).toEqual(
			expect.arrayContaining([
				'https://site.example/blog',
				'https://site.example/eventos',
				'https://site.example/taxas',
				'https://site.example/blog/bem-vindo',
				'https://site.example/eventos/evento-demo',
			]),
		);
		expect(entries.find((entry) => entry.url === 'https://site.example/blog/bem-vindo')).toMatchObject({
			lastModified: '2026-09-03T00:00:00.000Z',
			changeFrequency: 'monthly',
			priority: 0.6,
		});
		expect(new Set(urls).size).toBe(urls.length);
	});

	it('still answers with the fixed sections when the content API is unavailable', async () => {
		respondByPath({
			'/api/content/sitemap': () => {
				throw new Error('API offline');
			},
		});
		vi.spyOn(console, 'error').mockImplementation(() => {});

		const urls = (await sitemap()).map((entry) => entry.url);

		expect(urls).toEqual([
			'https://site.example',
			'https://site.example/eventos',
			'https://site.example/blog',
			'https://site.example/taxas',
		]);
	});
});
