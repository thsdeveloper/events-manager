import { describe, expect, it, vi } from 'vitest';
import type { IamAccess } from '@events-manager/contracts';
import { installIamAuthorization } from '../src/routes/iam-authorization.js';
import { buildRouteTestApp, createSupabaseClientsStub, sessionCookie } from './support/index.js';
const actor = '11111111-1111-4111-8111-111111111111',
	org = '22222222-2222-4222-8222-222222222222',
	event = '33333333-3333-4333-8333-333333333333',
	ticket = '44444444-4444-4444-8444-444444444444';
async function fixture(extra: Partial<IamAccess> = {}, eventOrg = org) {
	const access: IamAccess = {
		userId: actor,
		organizationId: org,
		isOwner: false,
		active: true,
		permissions: [],
		events: [{ eventId: event, permissions: ['events.read', 'checkin.execute'] }],
		...extra,
	};
	const stub = createSupabaseClientsStub({
		user: { id: actor, email: 'actor@example.test' },
		tables: {
			organizers: { data: [{ id: org, status: 'active' }] },
			events: { data: { organizer_id: eventOrg } },
			registration_tickets: { data: { event_id: event } },
		},
		rpc: { data: access },
	});
	const handler = vi.fn(async () => ({ success: true }));
	const app = await buildRouteTestApp(async (app) => {
		installIamAuthorization(app, stub.clients);
		app.get('/api/organizer/finance/overview', handler);
		app.post('/api/admin/participantes/:id/checkin', handler);
		app.get('/api/admin/unmapped', handler);
		app.get('/api/events', async (request) => ({ eventIds: request.iam?.eventIds }));
		app.post('/api/admin/ingressos', handler);
		app.patch('/api/events/:id', handler);
		app.patch('/api/organizer/profile', handler);
		app.get('/api/organizer/iam/access', handler);
		app.get('/api/events/public', handler);
	}, {});
	return { app, handler, ...stub, access };
}
describe('IAM API enforcement', () => {
	it('denies unauthenticated requests', async () => {
		const { app, handler } = await fixture();
		const r = await app.inject('/api/organizer/finance/overview');
		expect(r.statusCode).toBe(401);
		expect(handler).not.toHaveBeenCalled();
		await app.close();
	});
	it('denies financial access to a check-in operator', async () => {
		const { app, handler } = await fixture();
		const r = await app.inject({ url: '/api/organizer/finance/overview', headers: sessionCookie() });
		expect(r.statusCode).toBe(403);
		expect(handler).not.toHaveBeenCalled();
		await app.close();
	});
	it('allows a ticket in the assigned event and rejects a foreign tenant resource', async () => {
		for (const foreign of [false, true]) {
			const { app, handler } = await fixture({}, foreign ? '55555555-5555-4555-8555-555555555555' : org);
			const r = await app.inject({
				method: 'POST',
				url: `/api/admin/participantes/${ticket}/checkin`,
				headers: sessionCookie(),
			});
			expect(r.statusCode).toBe(foreign ? 404 : 200);
			expect(handler).toHaveBeenCalledTimes(foreign ? 0 : 1);
			await app.close();
		}
	});
	it('rejects unknown administrative routes even for a valid member', async () => {
		const { app } = await fixture();
		expect((await app.inject({ url: '/api/admin/unmapped', headers: sessionCookie() })).statusCode).toBe(403);
		await app.close();
	});
	it('rejects malformed resource identifiers with 422', async () => {
		const { app } = await fixture();
		expect(
			(await app.inject({ method: 'POST', url: '/api/admin/participantes/invalid/checkin', headers: sessionCookie() }))
				.statusCode,
		).toBe(422);
		await app.close();
	});
	it('does not retain access after membership is suspended', async () => {
		const { app, rpc, access } = await fixture();
		expect(
			(
				await app.inject({
					method: 'POST',
					url: `/api/admin/participantes/${ticket}/checkin`,
					headers: sessionCookie(),
				})
			).statusCode,
		).toBe(200);
		rpc.mockResolvedValue({ data: { ...access, active: false }, error: null });
		expect(
			(
				await app.inject({
					method: 'POST',
					url: `/api/admin/participantes/${ticket}/checkin`,
					headers: sessionCookie(),
				})
			).statusCode,
		).toBe(403);
		await app.close();
	});
});

describe('global IAM request guard scopes', () => {
	it('passes only allowed event IDs to listing repositories', async () => {
		const { app } = await fixture();
		const response = await app.inject({ url: '/api/events', headers: sessionCookie() });
		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({ eventIds: [event] });
		await app.close();
	});
	it('rejects an explicitly requested event outside the allowed list', async () => {
		const { app } = await fixture();
		const response = await app.inject({
			url: '/api/events?event_id=55555555-5555-4555-8555-555555555555',
			headers: sessionCookie(),
		});
		expect(response.statusCode).toBe(403);
		await app.close();
	});
	it('checks event IDs supplied in ticket creation bodies', async () => {
		const { app } = await fixture({ permissions: ['tickets.create'] });
		expect(
			(
				await app.inject({
					method: 'POST',
					url: '/api/admin/ingressos',
					headers: sessionCookie(),
					payload: { event_id: event },
				})
			).statusCode,
		).toBe(200);
		expect(
			(
				await app.inject({
					method: 'POST',
					url: '/api/admin/ingressos',
					headers: sessionCookie(),
					payload: { event_id: 'bad' },
				})
			).statusCode,
		).toBe(422);
		await app.close();
	});
	it('protects legal identity even when a member may edit public organization data', async () => {
		const { app } = await fixture({ permissions: ['organization.update'] });
		expect(
			(
				await app.inject({
					method: 'PATCH',
					url: '/api/organizer/profile',
					headers: sessionCookie(),
					payload: { name: 'Allowed' },
				})
			).statusCode,
		).toBe(200);
		expect(
			(
				await app.inject({
					method: 'PATCH',
					url: '/api/organizer/profile',
					headers: sessionCookie(),
					payload: { document: '000' },
				})
			).statusCode,
		).toBe(403);
		await app.close();
	});
	it('rejects an active-workspace cookie from another organization', async () => {
		const { app } = await fixture();
		expect(
			(
				await app.inject({
					url: '/api/events',
					headers: { cookie: sessionCookie().cookie + '; active_organizer_id=55555555-5555-4555-8555-555555555555' },
				})
			).statusCode,
		).toBe(403);
		await app.close();
	});
	it('requires live membership for the IAM endpoints without changing public discovery', async () => {
		const { app } = await fixture({ active: false });
		expect((await app.inject({ url: '/api/organizer/iam/access', headers: sessionCookie() })).statusCode).toBe(403);
		expect((await app.inject({ url: '/api/events/public' })).statusCode).toBe(200);
		await app.close();
	});
	it('binds event edits directly to the route resource', async () => {
		const { app } = await fixture({ permissions: ['events.update'] });
		expect(
			(
				await app.inject({
					method: 'PATCH',
					url: '/api/events/' + event,
					headers: sessionCookie(),
					payload: { title: 'Updated' },
				})
			).statusCode,
		).toBe(200);
		await app.close();
	});
});
