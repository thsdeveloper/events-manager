import { describe, expect, it } from 'vitest';
import { cmsRoutes } from '../src/routes/cms.js';
import {
	buildRouteTestApp,
	createSupabaseClientsStub,
	createTestEnv,
	sessionCookie,
	TEST_USER_ID,
} from './support/index.js';

const superAdmin = { id: TEST_USER_ID, email: 'admin@example.com', role: 'super_admin', status: 'active' };
const attendee = { ...superAdmin, role: 'attendee' };
const PAGE_ID = '00000000-0000-4000-8000-000000000100';
const SEED_PAGE_ID = '20000000-0000-0000-0000-000000000001';
const SEED_BLOCK_ID = '44000000-0000-0000-0000-000000000001';

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
	it('opens the seeded homepage with its existing content blocks', async () => {
		const { app } = await buildApp({
			tables: {
				profiles: { data: superAdmin },
				pages: { data: { id: SEED_PAGE_ID, title: 'Início', permalink: '/', status: 'published' } },
				page_blocks: { data: [{ id: SEED_BLOCK_ID, collection: 'block_richtext', item: SEED_BLOCK_ID }] },
				block_richtext: { data: { id: SEED_BLOCK_ID, content: '<p>Bem-vindo à Flouvi.</p>' } },
			},
		});
		const response = await app.inject({
			method: 'GET',
			url: `/api/super-admin/cms/pages/${SEED_PAGE_ID}`,
			headers: sessionCookie(),
		});
		await app.close();
		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({
			id: SEED_PAGE_ID,
			blocks: [{ id: SEED_BLOCK_ID, item: { content: '<p>Bem-vindo à Flouvi.</p>' } }],
		});
	});

	it('loads activity for a page whose UUID predates the stricter RFC validation', async () => {
		const activity = { id: PAGE_ID, resource_id: SEED_PAGE_ID, action: 'cms.page.update', actor: superAdmin };
		const { app } = await buildApp({ tables: { profiles: { data: superAdmin }, audit_logs: { data: [activity] } } });
		const response = await app.inject({
			method: 'GET',
			url: `/api/super-admin/cms/pages/${SEED_PAGE_ID}/activity`,
			headers: sessionCookie(),
		});
		await app.close();
		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({ data: [{ resource_id: SEED_PAGE_ID, action: 'cms.page.update' }] });
	});

	it('saves the seeded homepage without replacing its ID', async () => {
		const before = { id: SEED_PAGE_ID, title: 'Início', permalink: '/', status: 'published' };
		const updated = { ...before, title: 'Página inicial' };
		const { app } = await buildApp({
			tables: {
				profiles: { data: superAdmin },
				pages: [{ data: { id: SEED_PAGE_ID } }, { data: before }, { data: updated }],
			},
		});
		const response = await app.inject({
			method: 'PATCH',
			url: `/api/super-admin/cms/pages/${SEED_PAGE_ID}`,
			headers: sessionCookie(),
			payload: updated,
		});
		await app.close();
		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject(updated);
	});

	it('updates a seeded content block through the page editor', async () => {
		const block = {
			id: SEED_BLOCK_ID,
			page: SEED_PAGE_ID,
			collection: 'block_richtext',
			item: SEED_BLOCK_ID,
			hide_block: false,
		};
		const { app } = await buildApp({
			tables: {
				profiles: { data: superAdmin },
				page_blocks: [{ data: block }, { data: block }, { data: { ...block, hide_block: true } }],
				block_richtext: { data: { id: SEED_BLOCK_ID, content: '<p>Flouvi</p>' } },
			},
		});
		const response = await app.inject({
			method: 'PATCH',
			url: `/api/super-admin/cms/pages/${SEED_PAGE_ID}/blocks/${SEED_BLOCK_ID}`,
			headers: sessionCookie(),
			payload: { hide_block: true },
		});
		await app.close();
		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({ id: SEED_BLOCK_ID, hide_block: true });
	});

	it('reorders blocks with the legacy IDs already stored on the page', async () => {
		const secondBlockId = '44000000-0000-0000-0000-000000000002';
		const { app } = await buildApp({
			tables: { profiles: { data: superAdmin }, page_blocks: { data: [{ id: SEED_BLOCK_ID }, { id: secondBlockId }] } },
		});
		const response = await app.inject({
			method: 'PUT',
			url: `/api/super-admin/cms/pages/${SEED_PAGE_ID}/blocks/order`,
			headers: sessionCookie(),
			payload: { order: [secondBlockId, SEED_BLOCK_ID] },
		});
		await app.close();
		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({ success: true });
	});

	it.each(['', '/activity'])('still rejects malformed IDs at the page endpoint %s', async (suffix) => {
		const { app } = await buildApp({ tables: { profiles: { data: superAdmin } } });
		const response = await app.inject({
			method: 'GET',
			url: `/api/super-admin/cms/pages/not-a-uuid${suffix}`,
			headers: sessionCookie(),
		});
		await app.close();
		expect(response.statusCode).toBe(422);
		expect(response.json()).toMatchObject({ title: 'VALIDATION_ERROR' });
	});

	it('returns 404 for an absent page with a well-formed legacy ID', async () => {
		const { app } = await buildApp({ tables: { profiles: { data: superAdmin }, pages: { data: null } } });
		const response = await app.inject({
			method: 'GET',
			url: `/api/super-admin/cms/pages/${SEED_PAGE_ID}`,
			headers: sessionCookie(),
		});
		await app.close();
		expect(response.statusCode).toBe(404);
		expect(response.json()).toMatchObject({ title: 'PAGE_NOT_FOUND' });
	});

	it.each([
		['anonymous', null, 401],
		['attendee', attendee, 403],
	] as const)('does not grant %s access to a seeded page', async (_role, profile, status) => {
		const { app } = await buildApp({
			user: profile ? { id: TEST_USER_ID, email: profile.email } : null,
			tables: { profiles: { data: profile } },
		});
		const response = await app.inject({
			method: 'GET',
			url: `/api/super-admin/cms/pages/${SEED_PAGE_ID}`,
			headers: profile ? sessionCookie() : {},
		});
		await app.close();
		expect(response.statusCode).toBe(status);
	});

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
