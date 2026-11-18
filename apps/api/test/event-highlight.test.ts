import { describe, expect, it, vi } from 'vitest';
import { cmsRoutes } from '../src/routes/cms.js';
import { SupabaseContentRepository } from '../src/infrastructure/supabase/content-repository.js';
import {
	buildRouteTestApp,
	createSupabaseClientsStub,
	createTestEnv,
	sessionCookie,
	TEST_USER_ID,
} from './support/index.js';

const pageId = '20000000-0000-0000-0000-000000000001';
const blockId = '44000000-0000-0000-0000-000000000001';
const itemId = '44000000-0000-0000-0000-000000000003';
const profile = { id: TEST_USER_ID, role: 'super_admin', status: 'active' };
const item = { display_mode: 'slider', max_items: 5, image_position: 'right', button_label: 'Comprar ingressos' };
const block = {
	id: blockId,
	page: pageId,
	collection: 'block_event_highlight',
	item: itemId,
	background: 'light',
	hide_block: false,
};
const media = { id: '44000000-0000-0000-0000-000000000002', bucket: 'media', path: 'event.png' };
const event = {
	id: 'event',
	title: 'Workshop',
	slug: 'workshop',
	start_date: '2026-11-20T18:00:00Z',
	cover_image: media,
};

async function setup(options: Parameters<typeof createSupabaseClientsStub>[0] = {}) {
	const stub = createSupabaseClientsStub({ user: { id: TEST_USER_ID, email: 'admin@example.test' }, ...options });
	const writes: Array<{ table: string; method: string; values: unknown }> = [];
	const originalFrom = stub.from.getMockImplementation()!;
	stub.from.mockImplementation((table) => {
		const builder = originalFrom(table);
		return new Proxy(builder, {
			get(target, key) {
				if (key === 'insert' || key === 'update')
					return (values: unknown) => {
						writes.push({ table, method: key, values });
						return (target[key] as (values: unknown) => unknown)(values);
					};
				return target[key as string];
			},
		});
	});
	const app = await buildRouteTestApp(cmsRoutes, { clients: stub.clients, env: createTestEnv() });
	return { app, writes };
}

describe('automatic CMS event highlight', () => {
	it('saves the automatic selection settings without manual event content', async () => {
		const { app, writes } = await setup({
			tables: {
				profiles: { data: profile },
				pages: { data: { id: pageId } },
				page_blocks: [{ data: [] }, { data: [] }, { data: block }],
				block_event_highlight: [{ data: { id: itemId } }, { data: { id: itemId, ...item } }],
			},
		});
		const response = await app.inject({
			method: 'POST',
			url: `/api/super-admin/cms/pages/${pageId}/blocks`,
			headers: sessionCookie(),
			payload: { collection: 'block_event_highlight', item },
		});
		await app.close();
		expect(response.statusCode).toBe(201);
		expect(response.json()).toMatchObject({ collection: block.collection, item });
		expect(writes).toContainEqual({ table: 'block_event_highlight', method: 'insert', values: item });
	});

	it('updates the slider settings through the existing block endpoint', async () => {
		const changed = { ...item, display_mode: 'single', max_items: 3 };
		const { app, writes } = await setup({
			tables: {
				profiles: { data: profile },
				page_blocks: { data: block },
				block_event_highlight: { data: { id: itemId, ...changed } },
			},
		});
		const response = await app.inject({
			method: 'PATCH',
			url: `/api/super-admin/cms/pages/${pageId}/blocks/${blockId}`,
			headers: sessionCookie(),
			payload: { item: changed },
		});
		await app.close();
		expect(response.statusCode).toBe(200);
		expect(response.json().item).toMatchObject(changed);
		expect(writes).toContainEqual({ table: 'block_event_highlight', method: 'update', values: changed });
	});

	it('rejects an invalid mode or an excessive event limit before writing', async () => {
		const { app, writes } = await setup({ tables: { profiles: { data: profile } } });
		for (const invalid of [
			{ ...item, display_mode: 'invalid' },
			{ ...item, max_items: 13 },
		]) {
			const response = await app.inject({
				method: 'POST',
				url: `/api/super-admin/cms/pages/${pageId}/blocks`,
				headers: sessionCookie(),
				payload: { collection: block.collection, item: invalid },
			});
			expect(response.statusCode).toBe(422);
			expect(response.json()).toMatchObject({ title: 'VALIDATION_ERROR' });
		}
		await app.close();
		expect(writes).toEqual([]);
	});

	it.each([401, 403])('rejects unauthorized creation with %i', async (status) => {
		const { app, writes } = await setup({
			user: status === 401 ? null : { id: TEST_USER_ID, email: 'user@example.test' },
			tables: { profiles: { data: { ...profile, role: 'attendee' } } },
		});
		const response = await app.inject({
			method: 'POST',
			url: `/api/super-admin/cms/pages/${pageId}/blocks`,
			headers: sessionCookie(),
			payload: { collection: block.collection, item },
		});
		await app.close();
		expect(response.statusCode).toBe(status);
		expect(writes).toEqual([]);
	});

	it.each(['slider', 'single'])('selects only published public events in creation order for %s mode', async (mode) => {
		const { clients, from } = createSupabaseClientsStub({
			tables: {
				pages: { data: { id: pageId } },
				page_blocks: { data: [block] },
				block_event_highlight: { data: { id: itemId, ...item, display_mode: mode } },
			},
		});
		const query = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			limit: vi.fn().mockResolvedValue({ data: [{ ...event, cover_image: [media] }], error: null }),
		};
		const originalFrom = from.getMockImplementation()!;
		from.mockImplementation((table) => (table === 'events' ? query : originalFrom(table)));
		const page = await new SupabaseContentRepository(clients.admin).getPage('/workshop', 1, {
			includeDrafts: true,
			now: '2026-11-17T12:00:00Z',
		});
		expect(page.blocks[0].item).toMatchObject({ ...item, display_mode: mode, events: [event] });
		expect(query.eq).toHaveBeenCalledWith('status', 'published');
		expect(query.eq).toHaveBeenCalledWith('visibility', 'public');
		expect(query.order).toHaveBeenCalledWith('date_created', { ascending: false });
		expect(query.limit).toHaveBeenCalledWith(mode === 'single' ? 1 : 5);
		expect(query.select).toHaveBeenCalledWith(
			'id,title,slug,short_description,cover_image_alt,start_date,end_date,event_type,location_name,location_address,cover_image:media_files(id,bucket,path,type)',
		);
	});

	it('returns an empty list when there are no eligible events', async () => {
		const { clients } = createSupabaseClientsStub({
			tables: {
				pages: { data: { id: pageId } },
				page_blocks: { data: [block] },
				block_event_highlight: { data: { id: itemId, ...item } },
				events: { data: null },
			},
		});
		const page = await new SupabaseContentRepository(clients.admin).getPage('/', 1, {
			includeDrafts: false,
			now: '2026-11-17T12:00:00Z',
		});
		expect(page.blocks[0].item).toMatchObject({ events: [] });
	});

	it('propagates a failed event lookup instead of publishing stale content', async () => {
		const error = new Error('database unavailable');
		const { clients } = createSupabaseClientsStub({
			tables: {
				pages: { data: { id: pageId } },
				page_blocks: { data: [block] },
				block_event_highlight: { data: { id: itemId, ...item } },
				events: { error },
			},
		});
		await expect(
			new SupabaseContentRepository(clients.admin).getPage('/', 1, {
				includeDrafts: false,
				now: '2026-11-17T12:00:00Z',
			}),
		).rejects.toBe(error);
	});
});
