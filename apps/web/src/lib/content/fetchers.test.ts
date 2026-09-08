import { beforeEach, describe, expect, it, vi } from 'vitest';

const backendFetch = vi.hoisted(() => vi.fn<(path: string, init?: Record<string, unknown>) => Promise<unknown>>());
vi.mock('@/lib/backend', () => ({ backendFetch }));

import {
	CMS_CONTENT_CACHE_TAG,
	fetchEventBySlug,
	fetchPageData,
	fetchPaginatedPosts,
	fetchPostBySlug,
	fetchRedirects,
	fetchSiteData,
	fetchTotalPostCount,
	SITE_DATA_CACHE_TAG,
} from './fetchers';

beforeEach(() => {
	backendFetch.mockReset();
	vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('content fetchers', () => {
	it('tags cached content reads so the CMS can invalidate them after a change', async () => {
		backendFetch.mockResolvedValue({ data: [], total: 3 });

		await fetchPageData('/sobre', 2);
		await fetchPostBySlug('novidades');
		await fetchPaginatedPosts(6, 1);
		await expect(fetchTotalPostCount()).resolves.toBe(3);
		await fetchRedirects();
		await fetchEventBySlug('festival');

		expect(backendFetch).toHaveBeenNthCalledWith(1, '/api/content/pages?permalink=%2Fsobre&page=2', {
			tags: [CMS_CONTENT_CACHE_TAG],
		});
		expect(backendFetch).toHaveBeenNthCalledWith(2, '/api/content/posts/novidades', { tags: [CMS_CONTENT_CACHE_TAG] });
		expect(backendFetch).toHaveBeenNthCalledWith(3, '/api/content/posts?limit=6&page=1', {
			tags: [CMS_CONTENT_CACHE_TAG],
		});
		expect(backendFetch).toHaveBeenNthCalledWith(5, '/api/content/redirects', { tags: [CMS_CONTENT_CACHE_TAG] });
		expect(backendFetch).toHaveBeenNthCalledWith(6, '/api/events/slug/festival');
	});

	it('never caches a draft preview and forwards its token', async () => {
		backendFetch.mockResolvedValue({ id: 'p' });

		await fetchPageData('/sobre', 1, 'tok.en');

		expect(backendFetch).toHaveBeenCalledWith('/api/content/pages?permalink=%2Fsobre&page=1&preview=tok.en', {
			revalidate: 0,
		});
	});

	it('falls back to the default identity and to no redirects when the API is down', async () => {
		backendFetch.mockRejectedValue(new Error('offline'));

		await expect(fetchSiteData()).resolves.toMatchObject({ globals: { title: 'Events Manager' } });
		await expect(fetchRedirects()).resolves.toEqual([]);
	});

	it('reads the site identity with its own cache tag', async () => {
		backendFetch.mockResolvedValue({ globals: { id: 's' } });

		await expect(fetchSiteData()).resolves.toEqual({ globals: { id: 's' } });
		expect(backendFetch).toHaveBeenCalledWith('/api/content/site', { tags: [SITE_DATA_CACHE_TAG] });
	});
});
