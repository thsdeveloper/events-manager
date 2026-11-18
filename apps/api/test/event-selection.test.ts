import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { organizerRoutes } from '../src/routes/organizers.js';
import { requireOrganizer } from '../src/routes/auth-context.js';
import { createSupabaseAuthService } from '../src/infrastructure/supabase/auth-repository.js';
import {
	buildRouteTestApp,
	createSupabaseClientsStub,
	createTestEnv,
	sessionCookie,
	TEST_USER_ID,
} from './support/index.js';

const org = '00000000-0000-4000-8000-000000000001';
const event = '00000000-0000-4000-8000-000000000002';
const other = '00000000-0000-4000-8000-000000000003';
const apps: FastifyInstance[] = [];
afterEach(async () => {
	await Promise.all(apps.splice(0).map((app) => app.close()));
});

async function setup({ authenticated = true, active = true, owned = true } = {}) {
	const stub = createSupabaseClientsStub({
		user: authenticated ? { id: TEST_USER_ID, email: 'ana@example.com' } : null,
		tables: {
			organizers: { data: active ? [{ id: org, status: 'active' }] : [] },
			events: { data: owned ? { id: event } : null },
		},
	});
	const app = await buildRouteTestApp(async (app) => {
		await organizerRoutes(app, { env: createTestEnv(), clients: stub.clients });
		app.get('/context', async (request) => requireOrganizer(request, createSupabaseAuthService(stub.clients)));
	}, {});
	apps.push(app);
	return { app, ...stub };
}

describe('seleção global de evento', () => {
	it('salva a seleção validada em cookie da organização e permite voltar a todos', async () => {
		const { app } = await setup();
		const response = await app.inject({
			method: 'POST',
			url: '/api/organizer/event-selection',
			headers: sessionCookie(),
			payload: { eventId: event },
		});
		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({ selectedEventId: event });
		expect(response.cookies).toContainEqual(
			expect.objectContaining({ name: 'active_event', value: `${org}:${event}`, httpOnly: true, sameSite: 'Lax' }),
		);
		const cleared = await app.inject({
			method: 'POST',
			url: '/api/organizer/event-selection',
			headers: sessionCookie(),
			payload: { eventId: null },
		});
		expect(cleared.statusCode).toBe(200);
		expect(cleared.json()).toEqual({ selectedEventId: null });
		expect(cleared.cookies).toContainEqual(expect.objectContaining({ name: 'active_event', value: '' }));
	});
	it.each(['GET', 'POST'] as const)('%s exige sessão e organização ativa', async (method) => {
		for (const [options, status] of [
			[{ authenticated: false }, 401],
			[{ active: false }, 403],
		] as const) {
			const { app } = await setup(options);
			const response = await app.inject({
				method,
				url: '/api/organizer/event-selection',
				headers: sessionCookie(),
				...(method === 'POST' ? { payload: { eventId: event } } : {}),
			});
			expect(response.statusCode).toBe(status);
		}
	});
	it('rejeita um identificador inválido e eventos de outra organização', async () => {
		const { app } = await setup({ owned: false });
		for (const [eventId, status] of [
			['invalid', 422],
			[other, 404],
		]) {
			const response = await app.inject({
				method: 'POST',
				url: '/api/organizer/event-selection',
				headers: sessionCookie(),
				payload: { eventId },
			});
			expect(response.statusCode).toBe(status);
			expect(response.cookies).toHaveLength(0);
		}
	});
	it('propaga a escolha para as requisições autenticadas seguintes', async () => {
		const { app } = await setup();
		const response = await app.inject({
			url: '/context',
			headers: { cookie: `access_token=test; active_event=${org}:${event}` },
		});
		expect(response.json()).toMatchObject({ eventId: event });
	});
	it.each([undefined, 'invalid', `${other}:${event}`])(
		'ignora preferência ausente, malformada ou de outra organização: %s',
		async (cookie) => {
			const { app } = await setup();
			const response = await app.inject({
				url: '/context',
				headers: { cookie: `access_token=test${cookie ? `; active_event=${cookie}` : ''}` },
			});
			expect(response.json()).toMatchObject({ eventId: null });
		},
	);
	it('volta a todos os eventos se a seleção foi removida ou deixou de pertencer à organização', async () => {
		const { app } = await setup({ owned: false });
		const response = await app.inject({
			url: '/context',
			headers: { cookie: `access_token=test; active_event=${org}:${event}` },
		});
		expect(response.json()).toMatchObject({ eventId: null });
	});
});
