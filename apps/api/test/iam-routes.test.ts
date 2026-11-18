import { describe, expect, it, vi } from 'vitest';
import { permissionDefinitions } from '@events-manager/contracts';
import { iamRoutes } from '../src/routes/iam.js';
import { buildRouteTestApp, createSupabaseClientsStub, sessionCookie, TEST_ENV } from './support/index.js';
const user = '11111111-1111-4111-8111-111111111111',
	org = '22222222-2222-4222-8222-222222222222',
	role = '33333333-3333-4333-8333-333333333333';
async function fixture(logged = true, allowed = true) {
	const stub = createSupabaseClientsStub({
		user: logged ? { id: user, email: 'owner@example.test' } : null,
		tables: {
			organizers: { data: [{ id: org, status: 'active' }] },
			organization_members: { data: [] },
			roles: { data: [] },
			user_invitations: { data: [] },
			events: { data: [] },
			audit_logs: { data: [] },
		},
	});
	stub.rpc.mockImplementation(async (name: string) => {
		if (name === 'consume_api_rate_limit') return { data: true, error: null };
		if (name === 'iam_access_context')
			return {
				data: {
					userId: user,
					organizationId: org,
					active: true,
					isOwner: true,
					permissions: allowed ? permissionDefinitions.map((p) => p.key) : [],
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
	const app = await buildRouteTestApp(iamRoutes, { clients: stub.clients, env: TEST_ENV, mailer: { send } });
	return { app, send, ...stub };
}
const endpoints = [
	['GET', '/api/organizer/iam/members', undefined],
	['GET', '/api/organizer/iam/roles', undefined],
	['GET', '/api/organizer/iam/permissions', undefined],
	['GET', '/api/organizer/iam/invitations', undefined],
	['GET', '/api/organizer/iam/events', undefined],
	['GET', '/api/organizer/iam/audit', undefined],
	[
		'POST',
		'/api/organizer/iam/invitations',
		{ email: 'member@example.test', assignments: [{ roleId: role, eventId: null }] },
	],
	['POST', '/api/organizer/iam/roles', { name: 'Role', permissions: ['events.read'] }],
	['PATCH', `/api/organizer/iam/roles/${role}`, { name: 'Role', permissions: ['events.read'] }],
	['DELETE', `/api/organizer/iam/roles/${role}`, undefined],
	['PATCH', `/api/organizer/iam/members/${role}`, { status: 'active', assignments: [{ roleId: role, eventId: null }] }],
	['DELETE', `/api/organizer/iam/members/${role}`, undefined],
	['DELETE', `/api/organizer/iam/invitations/${role}`, undefined],
	['POST', `/api/organizer/iam/invitations/${role}/resend`, undefined],
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
			['/api/organizer/iam/invitations', { email: 'bad', assignments: [] }],
			['/api/organizer/iam/roles', { name: 'X', permissions: ['platform.admin'] }],
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
					url: '/api/iam/invitations/accept',
					payload: { token: 'invalid' },
					headers: sessionCookie(),
				})
			).statusCode,
		).toBe(422);
		expect(
			(await app.inject({ method: 'POST', url: '/api/iam/invitations/accept', payload: { token: 'a'.repeat(43) } }))
				.statusCode,
		).toBe(401);
		const result = await app.inject({
			method: 'POST',
			url: '/api/iam/invitations/accept',
			payload: { token: 'a'.repeat(43) },
			headers: sessionCookie(),
		});
		expect(result.statusCode).toBe(200);
		expect(result.cookies.some((c) => c.name === 'active_organizer_id')).toBe(true);
		await app.close();
	});
});
