import { describe, expect, it, vi } from 'vitest';
import { platformPermissionDefinitions } from '@events-manager/contracts';
import { platformIamRoutes } from '../src/routes/platform-iam.js';
import { buildRouteTestApp, createSupabaseClientsStub, sessionCookie, TEST_ENV } from './support/index.js';
const user = '11111111-1111-4111-8111-111111111111',
	org = '22222222-2222-4222-8222-222222222222',
	role = '33333333-3333-4333-8333-333333333333';
async function fixture(logged = true, allowed = true) {
	const stub = createSupabaseClientsStub({
		user: logged ? { id: user, email: 'owner@example.test' } : null,
		tables: {
			profiles: { data: [] },
			platform_members: { data: [] },
			platform_roles: { data: [] },
			platform_invitations: { data: [] },
			events: { data: [] },
			audit_logs: { data: [] },
		},
	});
	stub.rpc.mockImplementation(async (name: string) => {
		if (name === 'consume_api_rate_limit') return { data: true, error: null };
		if (name === 'platform_access_context')
			return {
				data: {
					userId: user,
					organizationId: org,
					active: allowed,
					isRoot: false,
					permissions: allowed ? platformPermissionDefinitions.map((p) => p.key) : [],
					events: [],
				},
				error: null,
			};
		if (!allowed) return { data: null, error: { message: 'IAM_PERMISSION_DENIED' } };
		return {
			data: { id: role, email: 'member@example.test', expires_at: '2026-12-01', organizationId: org, memberId: role },
			error: null,
		};
	});
	const send = vi.fn().mockResolvedValue(undefined);
	const app = await buildRouteTestApp(platformIamRoutes, { clients: stub.clients, env: TEST_ENV, mailer: { send } });
	return { app, send, ...stub };
}
const endpoints = [
	['GET', '/api/super-admin/iam/members', undefined],
	['GET', '/api/super-admin/iam/roles', undefined],
	['GET', '/api/super-admin/iam/permissions', undefined],
	['GET', '/api/super-admin/iam/invitations', undefined],
	['GET', '/api/super-admin/iam/access', undefined],
	['GET', '/api/super-admin/iam/audit', undefined],
	[
		'POST',
		'/api/super-admin/iam/invitations',
		{ email: 'member@example.test', assignments: [{ roleId: role, eventId: null }] },
	],
	['POST', '/api/super-admin/iam/roles', { name: 'Role', permissions: ['platform_organizers.read'] }],
	['PATCH', `/api/super-admin/iam/roles/${role}`, { name: 'Role', permissions: ['platform_organizers.read'] }],
	['DELETE', `/api/super-admin/iam/roles/${role}`, undefined],
	[
		'PATCH',
		`/api/super-admin/iam/members/${role}`,
		{ status: 'active', assignments: [{ roleId: role, eventId: null }] },
	],
	['DELETE', `/api/super-admin/iam/members/${role}`, undefined],
	['DELETE', `/api/super-admin/iam/invitations/${role}`, undefined],
	['POST', `/api/super-admin/iam/invitations/${role}/resend`, undefined],
] as const;
describe('IAM management endpoints', () => {
	it.each(endpoints)('%s %s requires a session', async (method, url, payload) => {
		const { app } = await fixture(false);
		expect((await app.inject({ method, url, payload })).statusCode).toBe(401);
		await app.close();
	});
	it.each(endpoints)('%s %s rejects missing authority', async (method, url, payload) => {
		const { app } = await fixture(true, false);
		expect((await app.inject({ method, url, payload, headers: sessionCookie() })).statusCode).toBe(403);
		await app.close();
	});
	it.each(endpoints)('%s %s serves authorized management', async (method, url, payload) => {
		const { app } = await fixture();
		expect((await app.inject({ method, url, payload, headers: sessionCookie() })).statusCode).toBeLessThan(300);
		await app.close();
	});
	it('validates invitation and role fields with 422', async () => {
		const { app } = await fixture();
		for (const [url, payload] of [
			['/api/super-admin/iam/invitations', { email: 'bad', assignments: [] }],
			['/api/super-admin/iam/roles', { name: 'X', permissions: ['platform.admin'] }],
		] as const) {
			expect((await app.inject({ method: 'POST', url, payload, headers: sessionCookie() })).statusCode).toBe(422);
		}
		await app.close();
	});
	it('requires authentication and a valid token to accept an invitation', async () => {
		const { app } = await fixture();
		expect(
			(
				await app.inject({
					method: 'POST',
					url: '/api/platform-iam/invitations/accept',
					payload: { token: 'invalid' },
					headers: sessionCookie(),
				})
			).statusCode,
		).toBe(422);
		expect(
			(
				await app.inject({
					method: 'POST',
					url: '/api/platform-iam/invitations/accept',
					payload: { token: 'a'.repeat(43) },
				})
			).statusCode,
		).toBe(401);
		const result = await app.inject({
			method: 'POST',
			url: '/api/platform-iam/invitations/accept',
			payload: { token: 'a'.repeat(43) },
			headers: sessionCookie(),
		});
		expect(result.statusCode).toBe(200);
		expect(result.cookies.some((c) => c.name === 'active_organizer_id')).toBe(false);
		await app.close();
	});
});
