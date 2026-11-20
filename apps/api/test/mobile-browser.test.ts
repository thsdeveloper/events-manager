import { describe, expect, it, vi } from 'vitest';
import { buildRouteTestApp, createSupabaseClientsStub, createTestEnv } from './support/index.js';
import { authRoutes } from '../src/routes/auth.js';

const userId = '00000000-0000-4000-8000-000000000001';
async function fixture(active = true) {
	const stub = createSupabaseClientsStub({
		user: { id: userId, email: 'ana@example.test' },
		tables: {
			profiles: { data: { id: userId, status: active ? 'active' : 'suspended', role: 'attendee' } },
			organization_members: { data: [] },
			organizers: { data: [] },
		},
	});
	const admin = stub.clients.admin.auth.admin;
	admin.getUserById = vi.fn().mockResolvedValue({
		data: { user: { id: userId, email: 'ana@example.test', email_confirmed_at: '2026-11-01' } },
		error: null,
	});
	admin.generateLink = vi
		.fn()
		.mockResolvedValue({ data: { properties: { hashed_token: 'private-proof' } }, error: null });
	stub.clients.createPublicClient = vi.fn().mockReturnValue({
		auth: {
			verifyOtp: vi.fn().mockResolvedValue({
				data: {
					user: { id: userId },
					session: { access_token: 'browser-access', refresh_token: 'browser-refresh', expires_in: 3600 },
				},
				error: null,
			}),
		},
	});
	const app = await buildRouteTestApp(authRoutes, { clients: stub.clients, env: createTestEnv() });
	return { app, stub, admin };
}
describe('native checkout browser session', () => {
	it('opens only a first-party checkout with a separate HttpOnly browser session', async () => {
		const { app, admin } = await fixture();
		const response = await app.inject({
			method: 'POST',
			url: '/api/auth/mobile/web-session',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			payload: 'access_token=native-access&destination=%2Feventos%2Fcongresso%2Fcheckout',
		});
		await app.close();
		expect(response.statusCode).toBe(303);
		expect(response.headers.location).toBe('http://localhost:3003/eventos/congresso/checkout');
		expect(response.headers['set-cookie']).toEqual(
			expect.arrayContaining([
				expect.stringContaining('access_token=browser-access'),
				expect.stringContaining('HttpOnly'),
			]),
		);
		expect(response.body).not.toContain('browser-refresh');
		expect(admin.generateLink).toHaveBeenCalledWith({ type: 'magiclink', email: 'ana@example.test' });
	});
	it('rejects a missing bearer proof even when a browser session cookie exists', async () => {
		const { app, admin } = await fixture();
		const response = await app.inject({
			method: 'POST',
			url: '/api/auth/mobile/web-session',
			headers: { cookie: 'access_token=existing-cookie' },
			payload: { destination: '/perfil' },
		});
		await app.close();
		expect(response.statusCode).toBe(422);
		expect(admin.generateLink).not.toHaveBeenCalled();
	});
	it.each(['https://evil.test', '//evil.test', '/admin', '/perfil/../../admin'])(
		'rejects unsafe destination %s',
		async (destination) => {
			const { app, admin } = await fixture();
			const response = await app.inject({
				method: 'POST',
				url: '/api/auth/mobile/web-session',
				payload: { access_token: 'native-access', destination },
			});
			await app.close();
			expect(response.statusCode).toBe(422);
			expect(admin.generateLink).not.toHaveBeenCalled();
		},
	);
	it('rejects an expired native token', async () => {
		const { app, stub } = await fixture();
		stub.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'expired' } });
		const response = await app.inject({
			method: 'POST',
			url: '/api/auth/mobile/web-session',
			payload: { access_token: 'expired', destination: '/perfil' },
		});
		await app.close();
		expect(response.statusCode).toBe(401);
	});
	it('rejects suspended accounts', async () => {
		const { app, admin } = await fixture(false);
		const response = await app.inject({
			method: 'POST',
			url: '/api/auth/mobile/web-session',
			payload: { access_token: 'native-access', destination: '/perfil' },
		});
		await app.close();
		expect(response.statusCode).toBe(403);
		expect(admin.generateLink).not.toHaveBeenCalled();
	});
	it('requires confirmed email before issuing any browser credentials', async () => {
		const { app, admin } = await fixture();
		vi.mocked(admin.getUserById).mockResolvedValue({
			data: { user: { id: userId, email: 'ana@example.test' } },
			error: null,
		} as Awaited<ReturnType<typeof admin.getUserById>>);
		const response = await app.inject({
			method: 'POST',
			url: '/api/auth/mobile/web-session',
			payload: { access_token: 'native', destination: '/perfil' },
		});
		await app.close();
		expect(response.statusCode).toBe(403);
		expect(admin.generateLink).not.toHaveBeenCalled();
		expect(response.headers['set-cookie']).toBeUndefined();
	});
	it('does not expose a failed identity exchange or issue cookies', async () => {
		const { app, admin } = await fixture();
		vi.mocked(admin.generateLink).mockResolvedValue({
			data: { properties: null },
			error: { message: 'private provider detail' },
		} as unknown as Awaited<ReturnType<typeof admin.generateLink>>);
		const response = await app.inject({
			method: 'POST',
			url: '/api/auth/mobile/web-session',
			payload: { access_token: 'native', destination: '/perfil' },
		});
		await app.close();
		expect(response.statusCode).toBe(503);
		expect(response.headers['set-cookie']).toBeUndefined();
		expect(response.body).not.toContain('private provider detail');
	});
	it('rejects a browser session for a different identity', async () => {
		const { app, stub } = await fixture();
		stub.clients.createPublicClient = vi.fn().mockReturnValue({
			auth: {
				verifyOtp: vi.fn().mockResolvedValue({
					data: { user: { id: 'other-user' }, session: { access_token: 'private', refresh_token: 'private' } },
					error: null,
				}),
			},
		});
		const response = await app.inject({
			method: 'POST',
			url: '/api/auth/mobile/web-session',
			payload: { access_token: 'native', destination: '/perfil' },
		});
		await app.close();
		expect(response.statusCode).toBe(503);
		expect(response.headers['set-cookie']).toBeUndefined();
		expect(response.body).not.toContain('private');
	});
});
