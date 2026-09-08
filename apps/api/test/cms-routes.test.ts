import { describe, expect, it } from 'vitest';
import { cmsRoutes } from '../src/routes/cms.js';
import { buildRouteTestApp, createSupabaseClientsStub, createTestEnv, sessionCookie, TEST_USER_ID } from './support/index.js';

const superAdmin = { id: TEST_USER_ID, email: 'admin@example.com', role: 'super_admin', status: 'active' };
const attendee = { ...superAdmin, role: 'attendee' };
const PAGE_ID = '00000000-0000-4000-8000-000000000100';

async function buildApp(options: Parameters<typeof createSupabaseClientsStub>[0] = {}) {
	const stub = createSupabaseClientsStub({ user: { id: TEST_USER_ID, email: superAdmin.email }, ...options });
	const app = await buildRouteTestApp(cmsRoutes, { clients: stub.clients, env: createTestEnv() });
	return { app, stub };
}

describe('CMS routes: authorization', () => {
	it('rejects anonymous access to the content manager', async () => {
		const { app } = await buildApp({ user: null });

		const response = await app.inject({ method: 'GET', url: '/api/super-admin/cms/pages' });

		expect(response.statusCode).toBe(401);
	});

	it('rejects a signed-in user who is not a super admin', async () => {
		const { app } = await buildApp({ tables: { profiles: { data: attendee } } });

		const response = await app.inject({ method: 'GET', url: '/api/super-admin/cms/pages', headers: sessionCookie() });

		expect(response.statusCode).toBe(403);
		expect(response.json()).toMatchObject({ title: 'SUPER_ADMIN_REQUIRED' });
	});
});

describe('CMS routes: pages', () => {
	it('lists pages with pagination for the super admin', async () => {
		const { app } = await buildApp({
			tables: {
				profiles: { data: superAdmin },
				pages: { data: [{ id: PAGE_ID, title: 'Início', permalink: '/', status: 'published' }], count: 1 },
			},
		});

		const response = await app.inject({
			method: 'GET',
			url: '/api/super-admin/cms/pages?page=1&limit=20',
			headers: sessionCookie(),
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({
			data: [{ permalink: '/' }],
			pagination: { page: 1, limit: 20, total: 1, pageCount: 1 },
		});
	});

	it('validates the page payload with the shared contract', async () => {
		const { app } = await buildApp({ tables: { profiles: { data: superAdmin } } });

		const response = await app.inject({
			method: 'POST',
			url: '/api/super-admin/cms/pages',
			headers: sessionCookie(),
			payload: { title: 'Eventos', permalink: '/eventos' },
		});

		expect(response.statusCode).toBe(422);
		expect(response.json()).toMatchObject({ title: 'VALIDATION_ERROR' });
	});

	it('creates a page and records the audit trail', async () => {
		const created = { id: PAGE_ID, title: 'Sobre', permalink: '/sobre', status: 'draft', published_at: null };
		const { app, stub } = await buildApp({
			tables: {
				profiles: { data: superAdmin },
				pages: [{ data: null }, { data: created }],
				audit_logs: { data: null },
			},
		});

		const response = await app.inject({
			method: 'POST',
			url: '/api/super-admin/cms/pages',
			headers: sessionCookie(),
			payload: { title: 'Sobre', permalink: '/sobre' },
		});

		expect(response.statusCode).toBe(201);
		expect(response.json()).toMatchObject({ id: PAGE_ID, permalink: '/sobre' });
		expect(stub.from).toHaveBeenCalledWith('audit_logs');
	});

	it('rejects a block whose collection is unknown', async () => {
		const { app } = await buildApp({ tables: { profiles: { data: superAdmin } } });

		const response = await app.inject({
			method: 'POST',
			url: `/api/super-admin/cms/pages/${PAGE_ID}/blocks`,
			headers: sessionCookie(),
			payload: { collection: 'block_video', item: {} },
		});

		expect(response.statusCode).toBe(422);
	});

	it('issues a preview link for a draft page', async () => {
		const { app } = await buildApp({
			tables: {
				profiles: { data: superAdmin },
				pages: { data: { id: PAGE_ID, title: 'Sobre', permalink: '/sobre', status: 'draft' } },
				page_blocks: { data: [] },
			},
		});

		const response = await app.inject({
			method: 'POST',
			url: `/api/super-admin/cms/pages/${PAGE_ID}/preview`,
			headers: sessionCookie(),
		});

		expect(response.statusCode).toBe(201);
		expect(response.json().url).toMatch(/^http:\/\/localhost:3003\/sobre\?preview=/);
	});
});

describe('CMS routes: redirects and site settings', () => {
	it('validates redirect sources as relative paths', async () => {
		const { app } = await buildApp({ tables: { profiles: { data: superAdmin } } });

		const response = await app.inject({
			method: 'POST',
			url: '/api/super-admin/cms/redirects',
			headers: sessionCookie(),
			payload: { url_from: 'https://ex.com/a', url_to: '/b' },
		});

		expect(response.statusCode).toBe(422);
	});

	it('updates the site identity', async () => {
		const settings = { id: 's1', title: 'Events Manager', accent_color: '#6644ff' };
		const { app } = await buildApp({
			tables: {
				profiles: { data: superAdmin },
				site_settings: [{ data: settings }, { data: { ...settings, title: 'Novo nome' } }],
				audit_logs: { data: null },
			},
		});

		const response = await app.inject({
			method: 'PATCH',
			url: '/api/super-admin/cms/site',
			headers: sessionCookie(),
			payload: { title: 'Novo nome', accent_color: '#6644ff' },
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({ title: 'Novo nome' });
	});
});
