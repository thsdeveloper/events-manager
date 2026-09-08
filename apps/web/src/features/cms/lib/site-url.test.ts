import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const fetchCmsSiteSettings = vi.hoisted(() => vi.fn());
vi.mock('../api/server', () => ({ fetchCmsSiteSettings }));

import { resolvePublicSiteUrl } from './site-url';

afterEach(() => vi.unstubAllEnvs());

describe('resolvePublicSiteUrl', () => {
	it('uses the URL configured in the site settings without a trailing slash', async () => {
		fetchCmsSiteSettings.mockResolvedValueOnce({ url: 'https://eventos.local/' });

		await expect(resolvePublicSiteUrl()).resolves.toBe('https://eventos.local');
	});

	it('falls back to the public site env when the settings are unavailable', async () => {
		vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://fallback.local/');
		fetchCmsSiteSettings.mockRejectedValueOnce(new Error('offline'));

		await expect(resolvePublicSiteUrl()).resolves.toBe('https://fallback.local');
	});
});
