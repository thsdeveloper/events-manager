import { describe, expect, it } from 'vitest';
import { eventRoutes } from '../src/routes/events.js';
import { buildRouteTestApp, sessionCookie } from './support/index.js';
import { eventMemory } from './support/event-memory.js';
const USER = '00000000-0000-4000-8000-000000000001',
	ORG = '00000000-0000-4000-8000-000000000002',
	DRAFT = '00000000-0000-4000-8000-000000000030',
	OTHER = '00000000-0000-4000-8000-000000000031',
	EVENT = '00000000-0000-4000-8000-000000000040';
const snapshot = { id: DRAFT, organizer_id: ORG, values: { title: 'Inacabado' }, current_step: 2, event_id: null };
const validEvent = {
	title: 'Conferência de Produto',
	slug: 'conferencia-produto',
	start_date: '2026-12-01T10:00:00Z',
	end_date: '2026-12-01T20:00:00Z',
	status: 'published',
	is_free: true,
	tickets: [],
};
async function setup(options: Parameters<typeof eventMemory>[0] = {}) {
	const memory = eventMemory(options);
	return { ...memory, app: await buildRouteTestApp(eventRoutes, { clients: memory.clients }) };
}
describe('persisted event drafts', () => {
	it('saves incomplete work for a pending organizer and sanitizes all descriptions without creating an event', async () => {
		const { app, tables } = await setup({ organizers: [{ id: ORG, user_id: USER, status: 'pending' }] });
		const response = await app.inject({
			method: 'POST',
			url: '/api/event-drafts',
			headers: sessionCookie(),
			payload: {
				values: {
					title: '',
					description: '<p>PT<script>bad()</script></p>',
					description_en: '<p>EN<img src=x onerror=bad()></p>',
					description_es: '<p>ES<script>bad()</script></p>',
				},
				current_step: 1,
			},
		});
		await app.close();
		expect(response.statusCode).toBe(201);
		expect(response.json()).toMatchObject({
			organizer_id: ORG,
			current_step: 1,
			event_id: null,
			values: { title: '' },
		});
		expect(JSON.stringify(response.json().values)).not.toMatch(/<script|onerror/);
		expect(tables.events).toHaveLength(0);
	});
	it('lists only current organizer unconverted drafts and hides foreign ids', async () => {
		const { app } = await setup({
			tables: {
				event_drafts: [
					snapshot,
					{ ...snapshot, id: OTHER, organizer_id: 'foreign' },
					{ ...snapshot, id: EVENT, event_id: EVENT },
				],
			},
		});
		const list = await app.inject({ method: 'GET', url: '/api/event-drafts', headers: sessionCookie() });
		const foreign = await app.inject({ method: 'GET', url: '/api/event-drafts/' + OTHER, headers: sessionCookie() });
		await app.close();
		expect(list.statusCode).toBe(200);
		expect(list.json().data.map((r: { id: string }) => r.id)).toEqual([DRAFT]);
		expect(foreign.statusCode).toBe(404);
	});
	it('restores and updates the same draft and step', async () => {
		const { app, tables } = await setup({ tables: { event_drafts: [structuredClone(snapshot)] } });
		const get = await app.inject({ method: 'GET', url: '/api/event-drafts/' + DRAFT, headers: sessionCookie() });
		const put = await app.inject({
			method: 'PUT',
			url: '/api/event-drafts/' + DRAFT,
			headers: sessionCookie(),
			payload: { values: { title: 'Novo título', description_en: '<script>x()</script><p>Safe</p>' }, current_step: 4 },
		});
		await app.close();
		expect(get.statusCode).toBe(200);
		expect(put.statusCode).toBe(200);
		expect(tables.event_drafts).toHaveLength(1);
		expect(put.json()).toMatchObject({
			id: DRAFT,
			current_step: 4,
			values: { title: 'Novo título', description_en: '<p>Safe</p>' },
		});
	});
	it('deletes owner work without deleting a foreign draft', async () => {
		const { app, tables } = await setup({
			tables: { event_drafts: [structuredClone(snapshot), { ...snapshot, id: OTHER, organizer_id: 'foreign' }] },
		});
		const response = await app.inject({
			method: 'DELETE',
			url: '/api/event-drafts/' + DRAFT,
			headers: sessionCookie(),
		});
		await app.close();
		expect(response.statusCode).toBe(204);
		expect(tables.event_drafts.map((r) => r.id)).toEqual([OTHER]);
	});
	it('refuses updates and deletion after conversion', async () => {
		const { app } = await setup({ tables: { event_drafts: [{ ...snapshot, event_id: EVENT }] } });
		for (const method of ['PUT', 'DELETE'] as const) {
			const response = await app.inject({
				method,
				url: '/api/event-drafts/' + DRAFT,
				headers: sessionCookie(),
				...(method === 'PUT' ? { payload: { values: { title: 'Outro' }, current_step: 1 } } : {}),
			});
			expect(response.statusCode).toBe(409);
			expect(response.json().title).toBe('EVENT_DRAFT_CONVERTED');
		}
		await app.close();
	});
	it('validates step and id and requires authentication', async () => {
		const { app } = await setup();
		const invalid = await app.inject({
			method: 'POST',
			url: '/api/event-drafts',
			headers: sessionCookie(),
			payload: { values: {}, current_step: 7 },
		});
		const badId = await app.inject({ method: 'GET', url: '/api/event-drafts/bad-id', headers: sessionCookie() });
		const anon = await app.inject({
			method: 'POST',
			url: '/api/event-drafts',
			payload: { values: {}, current_step: 0 },
		});
		await app.close();
		expect(invalid.statusCode).toBe(422);
		expect(badId.statusCode).toBe(422);
		expect(anon.statusCode).toBe(401);
	});
	it('refuses archived organizers', async () => {
		const { app } = await setup({ organizers: [{ id: ORG, user_id: USER, status: 'archived' }] });
		const response = await app.inject({
			method: 'POST',
			url: '/api/event-drafts',
			headers: sessionCookie(),
			payload: { values: {}, current_step: 0 },
		});
		await app.close();
		expect(response.statusCode).toBe(403);
	});
	it('converts an owned draft once and returns the same event on retry', async () => {
		const { app, tables } = await setup({ tables: { event_drafts: [structuredClone(snapshot)] } });
		const first = await app.inject({
			method: 'POST',
			url: '/api/events',
			headers: sessionCookie(),
			payload: { ...validEvent, draft_id: DRAFT },
		});
		const second = await app.inject({
			method: 'POST',
			url: '/api/events',
			headers: sessionCookie(),
			payload: { ...validEvent, draft_id: DRAFT },
		});
		await app.close();
		expect(first.statusCode).toBe(201);
		expect(second.statusCode).toBe(201);
		expect(first.json().id).toBe(second.json().id);
		expect(tables.events).toHaveLength(1);
		expect(tables.events[0].source_draft_id).toBe(DRAFT);
		expect(tables.event_drafts[0].event_id).toBe(first.json().id);
	});
	it('returns a clear conflict when another conversion already reserved the draft identity', async () => {
		const { app, tables } = await setup({
			tables: {
				event_drafts: [structuredClone(snapshot)],
				events: [{ ...validEvent, id: EVENT, organizer_id: ORG, status: 'draft', source_draft_id: DRAFT }],
			},
		});
		const response = await app.inject({
			method: 'POST',
			url: '/api/events',
			headers: sessionCookie(),
			payload: { ...validEvent, draft_id: DRAFT },
		});
		await app.close();
		expect(response.statusCode).toBe(409);
		expect(response.json().title).toBe('EVENT_DRAFT_IN_USE');
		expect(tables.events).toHaveLength(1);
		expect(tables.events[0].id).toBe(EVENT);
	});
	it('does not convert a draft belonging to another owned organization', async () => {
		const second = '00000000-0000-4000-8000-000000000003';
		const { app, tables } = await setup({
			organizers: [
				{ id: ORG, user_id: USER, status: 'active' },
				{ id: second, user_id: USER, status: 'active' },
			],
			tables: { event_drafts: [structuredClone(snapshot)] },
		});
		const response = await app.inject({
			method: 'POST',
			url: '/api/events',
			headers: { cookie: 'access_token=token; active_organizer_id=' + second },
			payload: { ...validEvent, draft_id: DRAFT },
		});
		await app.close();
		expect(response.statusCode).toBe(404);
		expect(tables.events).toHaveLength(0);
	});
	it('sanitizes translations and retains the new event metadata on final creation', async () => {
		const { app, tables } = await setup();
		const response = await app.inject({
			method: 'POST',
			url: '/api/events',
			headers: sessionCookie(),
			payload: {
				...validEvent,
				description_en: '<script>bad()</script><p>English</p>',
				description_es: '<p onclick="bad()">Español</p>',
				cover_image_alt: 'Vista do encontro',
				location_tbd: true,
				show_map: false,
				location_city: 'Uberlândia',
				online_platform: 'custom',
			},
		});
		await app.close();
		expect(response.statusCode).toBe(201);
		expect(tables.events[0]).toMatchObject({
			description_en: '<p>English</p>',
			description_es: '<p>Español</p>',
			cover_image_alt: 'Vista do encontro',
			location_tbd: true,
			show_map: false,
			location_city: 'Uberlândia',
		});
	});
	it('rejects foreign drafts before creating an event', async () => {
		const { app, tables } = await setup({ tables: { event_drafts: [{ ...snapshot, organizer_id: 'foreign' }] } });
		const response = await app.inject({
			method: 'POST',
			url: '/api/events',
			headers: sessionCookie(),
			payload: { ...validEvent, draft_id: DRAFT },
		});
		await app.close();
		expect(response.statusCode).toBe(404);
		expect(tables.events).toHaveLength(0);
	});
});
describe('event publication boundaries', () => {
	it('honors an owned preference among legacy organizations', async () => {
		const second = '00000000-0000-4000-8000-000000000003';
		const { app, tables } = await setup({
			organizers: [
				{ id: ORG, user_id: USER, status: 'active' },
				{ id: second, user_id: USER, status: 'active' },
			],
		});
		const response = await app.inject({
			method: 'POST',
			url: '/api/events',
			headers: { cookie: 'access_token=token; active_organizer_id=' + second },
			payload: validEvent,
		});
		await app.close();
		expect(response.statusCode).toBe(201);
		expect(tables.events[0].organizer_id).toBe(second);
	});
	it('ignores a foreign preference instead of leaking another organizer', async () => {
		const { app, tables } = await setup();
		const response = await app.inject({
			method: 'POST',
			url: '/api/events',
			headers: { cookie: 'access_token=token; active_organizer_id=' + OTHER },
			payload: validEvent,
		});
		await app.close();
		expect(response.statusCode).toBe(201);
		expect(tables.events[0].organizer_id).toBe(ORG);
	});
	it('rejects publishing by a pending organizer but allows owner editing and unpublishing', async () => {
		const { app, tables } = await setup({
			organizers: [{ id: ORG, user_id: USER, status: 'pending' }],
			tables: { events: [{ ...validEvent, id: EVENT, organizer_id: ORG, status: 'draft' }] },
		});
		const create = await app.inject({
			method: 'POST',
			url: '/api/events',
			headers: sessionCookie(),
			payload: validEvent,
		});
		const publish = await app.inject({
			method: 'PATCH',
			url: '/api/events/' + EVENT,
			headers: sessionCookie(),
			payload: { status: 'published' },
		});
		const edit = await app.inject({
			method: 'PATCH',
			url: '/api/events/' + EVENT,
			headers: sessionCookie(),
			payload: { title: 'Título corrigido' },
		});
		tables.events[0].status = 'published';
		const unpublish = await app.inject({
			method: 'PATCH',
			url: '/api/events/' + EVENT,
			headers: sessionCookie(),
			payload: { status: 'draft' },
		});
		await app.close();
		expect(create.statusCode).toBe(403);
		expect(publish.statusCode).toBe(403);
		expect(edit.statusCode).toBe(200);
		expect(unpublish.statusCode).toBe(200);
	});
});

describe('immutable organizer context', () => {
	it('keeps the organization selected when the request begins even if the remembered selection changes during conversion', async () => {
		const second = '00000000-0000-4000-8000-000000000003';
		const memory = eventMemory({
			organizers: [
				{ id: ORG, user_id: USER, status: 'active' },
				{ id: second, user_id: USER, status: 'active' },
			],
			tables: { profiles: [{ id: USER, active_organizer_id: ORG }], event_drafts: [structuredClone(snapshot)] },
		});
		const originalFrom = memory.from.getMockImplementation()!;
		let changed = false;
		memory.from.mockImplementation((table: string) => {
			const query = originalFrom(table);
			if (table === 'event_drafts' && !changed) {
				memory.tables.profiles[0].active_organizer_id = second;
				changed = true;
			}
			return query;
		});
		const app = await buildRouteTestApp(eventRoutes, { clients: memory.clients });
		const response = await app.inject({
			method: 'POST',
			url: '/api/events',
			headers: sessionCookie(),
			payload: { ...validEvent, draft_id: DRAFT },
		});
		await app.close();
		expect(response.statusCode).toBe(201);
		expect(memory.tables.events[0].organizer_id).toBe(ORG);
		expect(memory.tables.event_drafts[0].event_id).toBe(memory.tables.events[0].id);
	});
});

describe('paid event publication readiness', () => {
	it.each([
		{
			name: 'publishing an existing paid draft without tickets',
			status: 'draft',
			is_free: false,
			patch: { status: 'published' },
		},
		{
			name: 'turning a public free event into a paid event without tickets',
			status: 'published',
			is_free: true,
			patch: { is_free: false },
		},
	])('refuses $name before writing', async ({ status, is_free, patch }) => {
		const { app, tables, writes } = await setup({
			tables: { events: [{ ...validEvent, id: EVENT, organizer_id: ORG, status, is_free, tickets: [] }] },
		});
		const response = await app.inject({
			method: 'PATCH',
			url: '/api/events/' + EVENT,
			headers: sessionCookie(),
			payload: patch,
		});
		await app.close();
		expect(response.statusCode).toBe(422);
		expect(response.json()).toMatchObject({
			title: 'EVENT_TICKETS_REQUIRED',
			detail: 'Adicione ao menos um ingresso antes de publicar um evento pago.',
		});
		expect(writes.filter((write) => write.table === 'events' && write.method === 'update')).toHaveLength(0);
		expect(tables.events[0]).toMatchObject({ status, is_free });
	});
	it('allows a paid draft to remain incomplete', async () => {
		const { app } = await setup({
			tables: {
				events: [{ ...validEvent, id: EVENT, organizer_id: ORG, status: 'draft', is_free: false, tickets: [] }],
			},
		});
		const response = await app.inject({
			method: 'PATCH',
			url: '/api/events/' + EVENT,
			headers: sessionCookie(),
			payload: { title: 'Ainda em preparação' },
		});
		await app.close();
		expect(response.statusCode).toBe(200);
	});
	it('allows a paid page with a sold-out ticket to be published', async () => {
		const { app } = await setup({
			tables: {
				events: [
					{
						...validEvent,
						id: EVENT,
						organizer_id: ORG,
						status: 'draft',
						is_free: false,
						tickets: [{ id: OTHER, status: 'sold_out' }],
					},
				],
			},
		});
		const response = await app.inject({
			method: 'PATCH',
			url: '/api/events/' + EVENT,
			headers: sessionCookie(),
			payload: { status: 'published' },
		});
		await app.close();
		expect(response.statusCode).toBe(200);
	});
});
