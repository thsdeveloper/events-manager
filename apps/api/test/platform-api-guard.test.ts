import { describe, it, expect, vi } from 'vitest';
import { installPlatformAuthorization } from '../src/routes/platform-authorization.js';
import { requireSuperAdmin } from '../src/routes/auth-context.js';
import { createSupabaseAuthService } from '../src/infrastructure/supabase/auth-repository.js';
import { buildRouteTestApp, createSupabaseClientsStub, sessionCookie, TEST_USER_ID } from './support/index.js';
async function fixture(permissions: string[], active = true, authenticated = true) {
	const stub = createSupabaseClientsStub({
		user: authenticated ? { id: TEST_USER_ID, email: 'person@example.test' } : null,
		tables: { profiles: { data: { id: TEST_USER_ID, role: 'attendee', status: 'active' } } },
	});
	stub.rpc.mockImplementation(async () => ({
		data: { userId: TEST_USER_ID, active, isRoot: false, permissions },
		error: null,
	}));
	const app = await buildRouteTestApp(async (app) => {
		installPlatformAuthorization(app, stub.clients);
		const auth = createSupabaseAuthService(stub.clients);
		for (const method of ['GET', 'PATCH'] as const)
			app.route({
				method,
				url: '/api/super-admin/categories',
				handler: async (request) => {
					await requireSuperAdmin(request, auth);
					return { allowed: true };
				},
			});
		app.get('/api/super-admin/unknown', async () => ({ secret: true }));
		app.get('/api/super-admin/organizers/:id', async () => ({
			organizer: { name: 'Organizer', payout_pix_key: 'private' },
			metrics: { events: 1, grossRevenue: 20 },
		}));
	}, {});
	return { app, ...stub };
}
describe('platform API guard', () => {
	it('allows a delegated reader without promoting their profile', async () => {
		const { app } = await fixture(['platform_categories.read']);
		const r = await app.inject({ url: '/api/super-admin/categories', headers: sessionCookie() });
		expect(r.statusCode).toBe(200);
		expect(r.headers['cache-control']).toBe('private, no-store');
		await app.close();
	});
	it('blocks writes for readers', async () => {
		const { app } = await fixture(['platform_categories.read']);
		expect(
			(await app.inject({ method: 'PATCH', url: '/api/super-admin/categories', headers: sessionCookie(), payload: {} }))
				.statusCode,
		).toBe(403);
		await app.close();
	});
	it('denies anonymous sessions', async () => {
		const { app } = await fixture([], true, false);
		expect((await app.inject({ url: '/api/super-admin/categories' })).statusCode).toBe(401);
		await app.close();
	});
	it('denies a revoked platform membership', async () => {
		const { app } = await fixture(['platform_categories.read'], false);
		expect((await app.inject({ url: '/api/super-admin/categories', headers: sessionCookie() })).statusCode).toBe(403);
		await app.close();
	});
	it('denies unregistered administrative operations', async () => {
		const { app } = await fixture(['platform_categories.read']);
		expect((await app.inject({ url: '/api/super-admin/unknown', headers: sessionCookie() })).statusCode).toBe(403);
		await app.close();
	});
});

it('redacts restricted data from the serialized HTTP response', async () => {
	const { app } = await fixture(['platform_organizers.read']);
	const response = await app.inject({ url: '/api/super-admin/organizers/o', headers: sessionCookie() });
	expect(response.statusCode).toBe(200);
	expect(response.json()).toEqual({ organizer: { name: 'Organizer' }, metrics: { events: 1 } });
	await app.close();
});
