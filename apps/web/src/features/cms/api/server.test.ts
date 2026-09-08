import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const backendFetch = vi.hoisted(() => vi.fn(async (_path: string) => ({ data: [] })));
vi.mock('@/lib/backend-auth', () => ({ authenticatedBackendFetch: backendFetch }));

import * as server from './server';

beforeEach(() => backendFetch.mockClear());

describe('CMS server fetchers', () => {
	it('builds the list query only with the filters that were given', async () => {
		await server.fetchCmsPages({ page: 2, search: 'sobre', status: undefined, limit: 20 });
		await server.fetchCmsPosts();
		await server.fetchCmsMedia({ search: '' });

		expect(backendFetch).toHaveBeenNthCalledWith(1, '/api/super-admin/cms/pages?page=2&search=sobre&limit=20');
		expect(backendFetch).toHaveBeenNthCalledWith(2, '/api/super-admin/cms/posts');
		expect(backendFetch).toHaveBeenNthCalledWith(3, '/api/super-admin/cms/media');
	});

	it('addresses every resource under the CMS base path', async () => {
		await server.fetchCmsOverview();
		await server.fetchCmsPage('p1');
		await server.fetchCmsPageActivity('p1');
		await server.fetchCmsPost('post-1');
		await server.fetchCmsNavigations();
		await server.fetchCmsNavigation('main');
		await server.fetchCmsForms();
		await server.fetchCmsForm('f1');
		await server.fetchCmsFormSubmissions('f1', { page: 3, limit: 25 });
		await server.fetchCmsRedirects();
		await server.fetchCmsSiteSettings();

		expect(backendFetch.mock.calls.map(([path]) => path)).toEqual([
			'/api/super-admin/cms/overview',
			'/api/super-admin/cms/pages/p1',
			'/api/super-admin/cms/pages/p1/activity',
			'/api/super-admin/cms/posts/post-1',
			'/api/super-admin/cms/navigation',
			'/api/super-admin/cms/navigation/main',
			'/api/super-admin/cms/forms',
			'/api/super-admin/cms/forms/f1',
			'/api/super-admin/cms/forms/f1/submissions?page=3&limit=25',
			'/api/super-admin/cms/redirects',
			'/api/super-admin/cms/site',
		]);
	});
});
