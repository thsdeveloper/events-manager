import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { eventRoutes } from '../src/routes/events.js';
import {
	buildRouteTestApp,
	createSupabaseClientsStub,
	sessionCookie,
	TEST_EVENT_ID,
	TEST_ORGANIZER_ID,
	TEST_USER_ID,
} from './support/index.js';
const video = 'https://youtu.be/M7lc1UVf-VE';
const input = {
	title: 'Evento com vídeo',
	slug: 'evento-com-video',
	start_date: '2027-01-01T12:00:00Z',
	end_date: '2027-01-01T21:00:00Z',
	event_type: 'online',
	online_url: 'https://meet.example.test/private',
	status: 'draft',
	is_free: true,
};
const apps: FastifyInstance[] = [];
afterEach(async () => {
	await Promise.all(apps.splice(0).map((app) => app.close()));
});
async function setup({ authenticated = true, owned = true } = {}) {
	const stub = createSupabaseClientsStub({
		user: authenticated ? { id: TEST_USER_ID, email: 'owner@example.test' } : null,
		tables: { organizers: { data: [{ id: TEST_ORGANIZER_ID, status: 'active', user_id: TEST_USER_ID }] } },
	});
	let row: Record<string, unknown> = { ...input, id: TEST_EVENT_ID, organizer_id: TEST_ORGANIZER_ID, video_url: video };
	const writes = vi.fn();
	const original = stub.from.getMockImplementation()!;
	stub.from.mockImplementation((table: string) => {
		if (table !== 'events') return original(table);
		let selected = '*';
		let matches = owned;
		const builder: Record<string, unknown> = new Proxy(
			{},
			{
				get(_target, key) {
					if (key === 'then')
						return (resolve: (value: unknown) => unknown) =>
							Promise.resolve({
								data: matches
									? selected === '*' || selected.trimStart().startsWith('*,')
										? { ...row }
										: Object.fromEntries(
												Object.entries(row).filter(([name]) => selected.split(/[\s,]+/).includes(name)),
											)
									: null,
								error: null,
							}).then(resolve);
					return (...args: unknown[]) => {
						if (key === 'select') selected = String(args[0]);
						if (key === 'eq' && args[0] === 'organizer_id') matches = owned && args[1] === row.organizer_id;
						if (key === 'insert' || key === 'update') {
							writes(args[0]);
							row = { ...row, ...(args[0] as object) };
						}
						return builder;
					};
				},
			},
		);
		return builder;
	});
	const app = await buildRouteTestApp(eventRoutes, { clients: stub.clients });
	apps.push(app);
	return { app, writes };
}
describe('public event presentation video API', () => {
	it('returns the presentation video without disclosing the private online access URL', async () => {
		const { app } = await setup();
		const response = await app.inject({ url: '/api/events/slug/evento-com-video' });
		expect(response.statusCode).toBe(200);
		expect(response.json()).toHaveProperty('video_url', video);
		expect(response.json()).not.toHaveProperty('online_url');
	});
	it('persists the video on creation, changes it and removes it without clearing private online access', async () => {
		const { app, writes } = await setup();
		const created = await app.inject({
			method: 'POST',
			url: '/api/events',
			headers: sessionCookie(),
			payload: { ...input, video_url: video },
		});
		expect(created.statusCode).toBe(201);
		expect(writes).toHaveBeenCalledWith(expect.objectContaining({ video_url: video }));
		const changed = await app.inject({
			method: 'PATCH',
			url: `/api/events/${TEST_EVENT_ID}`,
			headers: sessionCookie(),
			payload: { video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
		});
		expect(changed.statusCode, changed.body).toBe(200);
		expect(changed.json()).toMatchObject({
			video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
			online_url: input.online_url,
		});
		const removed = await app.inject({
			method: 'PATCH',
			url: `/api/events/${TEST_EVENT_ID}`,
			headers: sessionCookie(),
			payload: { video_url: null },
		});
		expect(removed.statusCode).toBe(200);
		expect(removed.json()).toMatchObject({ video_url: null, online_url: input.online_url });
	});
	it.each(['POST', 'PATCH'] as const)('rejects invalid video URLs before writing (%s)', async (method) => {
		const { app, writes } = await setup();
		const response = await app.inject({
			method,
			url: method === 'POST' ? '/api/events' : `/api/events/${TEST_EVENT_ID}`,
			headers: sessionCookie(),
			payload: { ...(method === 'POST' ? input : {}), video_url: 'https://example.test/video' },
		});
		expect(response.statusCode).toBe(422);
		expect(writes).not.toHaveBeenCalled();
	});
	it('requires authentication to change a video', async () => {
		const { app, writes } = await setup({ authenticated: false });
		expect(
			(await app.inject({ method: 'PATCH', url: `/api/events/${TEST_EVENT_ID}`, payload: { video_url: video } }))
				.statusCode,
		).toBe(401);
		expect(writes).not.toHaveBeenCalled();
	});
	it('does not change another organization’s event', async () => {
		const { app, writes } = await setup({ owned: false });
		expect(
			(
				await app.inject({
					method: 'PATCH',
					url: `/api/events/${TEST_EVENT_ID}`,
					headers: sessionCookie(),
					payload: { video_url: video },
				})
			).statusCode,
		).toBe(404);
		expect(writes).not.toHaveBeenCalled();
	});
});
