import { afterEach, describe, expect, it, vi } from 'vitest';
import { absoluteUrl, resolveSiteUrl } from './site-url';

afterEach(() => vi.unstubAllEnvs());

describe('resolveSiteUrl', () => {
	it('prefers the public URL configured in the CMS, without a trailing slash', () => {
		vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://env.example');

		expect(resolveSiteUrl({ id: 'g', url: 'https://cms.example/' })).toBe('https://cms.example');
	});

	it('falls back to NEXT_PUBLIC_SITE_URL and then to the local dev address', () => {
		vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://env.example');
		expect(resolveSiteUrl({ id: 'g', url: null })).toBe('https://env.example');

		vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
		expect(resolveSiteUrl(undefined)).toBe('http://localhost:3003');
	});
});

describe('absoluteUrl', () => {
	it('keeps absolute URLs and prefixes site-relative paths with the site URL', () => {
		expect(absoluteUrl('https://site.example', 'https://cdn.example/a.png')).toBe('https://cdn.example/a.png');
		expect(absoluteUrl('https://site.example', '/api/media/abc')).toBe('https://site.example/api/media/abc');
		expect(absoluteUrl('https://site.example', '/')).toBe('https://site.example/');
	});

	it('returns undefined for empty values', () => {
		expect(absoluteUrl('https://site.example', '')).toBeUndefined();
		expect(absoluteUrl('https://site.example', null)).toBeUndefined();
	});
});
