import { describe, expect, it, vi } from 'vitest';

const fetchRedirects = vi.hoisted(() => vi.fn());
vi.mock('./content/fetchers', () => ({ fetchRedirects }));

import { generateRedirects, isRedirectError } from './redirects';

describe('generateRedirects', () => {
	it('turns CMS redirects into Next config entries, keeping only complete ones', async () => {
		fetchRedirects.mockResolvedValue([
			{ url_from: '/antigo', url_to: '/novo', response_code: '301' },
			{ url_from: '/temp', url_to: 'https://ex.com', response_code: '302' },
			{ url_from: null, url_to: '/x', response_code: '301' },
		]);

		await expect(generateRedirects()).resolves.toEqual([
			{ source: '/antigo', destination: '/novo', permanent: true },
			{ source: '/temp', destination: 'https://ex.com', permanent: false },
		]);
	});

	it('returns no redirects when the API cannot be reached', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		fetchRedirects.mockRejectedValue(new Error('offline'));

		await expect(generateRedirects()).resolves.toEqual([]);
	});

	it('recognises the redirect marker thrown by page rendering', () => {
		expect(isRedirectError({ type: 'redirect', destination: '/x', status: '301' })).toBe(true);
		expect(isRedirectError(new Error('x'))).toBe(false);
		expect(isRedirectError(null)).toBe(false);
	});
});
