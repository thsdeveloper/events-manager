import { describe, expect, it } from 'vitest';
import { notificationRoutes } from '../src/routes/notifications.js';
import { organizationRoutePolicy } from '../src/application/iam/route-policy.js';
import {
	buildRouteTestApp,
	createSupabaseClientsStub,
	sessionCookie,
	TEST_USER_ID,
	TEST_ORGANIZER_ID,
} from './support/index.js';
async function setup(authenticated = true, owner = true) {
	const organizer = {
		id: TEST_ORGANIZER_ID,
		user_id: TEST_USER_ID,
		status: 'active',
		email_preferences: { sales: false },
	};
	const stub = createSupabaseClientsStub({
		user: authenticated ? { id: TEST_USER_ID, email: 'owner@example.test' } : null,
		tables: {
			profiles: {
				data: { id: TEST_USER_ID, status: 'active', role: 'organizer', email_preferences: { event_reminders: false } },
			},
			organizers: { data: owner ? [organizer] : [] },
		},
	});
	const app = await buildRouteTestApp(notificationRoutes, { clients: stub.clients });
	return { app, ...stub };
}
describe('email preference routes', () => {
	it('loads the selected organization preferences rather than personal defaults', async () => {
		const organizer = {
			id: TEST_ORGANIZER_ID,
			user_id: TEST_USER_ID,
			status: 'active',
			email_preferences: { sales: false },
		};
		const { clients } = createSupabaseClientsStub({
			user: { id: TEST_USER_ID, email: 'owner@example.test' },
			tables: {
				profiles: { data: { id: TEST_USER_ID, status: 'active' } },
				organizers: [{ data: [organizer] }, { data: organizer }],
			},
		});
		const app = await buildRouteTestApp(notificationRoutes, { clients });
		const response = await app.inject({
			method: 'GET',
			url: '/api/organizer/notification-preferences',
			headers: sessionCookie(),
		});
		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({ settings: { sales: false, refunds: true } });
		await app.close();
	});
	it('loads only the authenticated user preferences with private cache controls', async () => {
		const { app } = await setup();
		const res = await app.inject({
			method: 'GET',
			url: '/api/user/notification-preferences',
			headers: sessionCookie(),
		});
		expect(res.statusCode).toBe(200);
		expect(res.json()).toMatchObject({ settings: { event_reminders: false, payment_updates: true } });
		expect(res.headers['cache-control']).toBe('private, no-store');
		await app.close();
	});
	it('persists user choices and rejects attempts to change another user', async () => {
		const { app, from } = await setup();
		const res = await app.inject({
			method: 'PUT',
			url: '/api/user/notification-preferences',
			headers: sessionCookie(),
			payload: { event_reminders: false },
		});
		expect(res.statusCode).toBe(200);
		expect(res.json()).toMatchObject({ settings: { event_reminders: false } });
		expect(from).toHaveBeenCalledWith('profiles');
		const invalid = await app.inject({
			method: 'PUT',
			url: '/api/user/notification-preferences',
			headers: sessionCookie(),
			payload: { user_id: 'other' },
		});
		expect(invalid.statusCode).toBe(422);
		await app.close();
	});
	it('requires an authenticated account for both user and organization preferences', async () => {
		const { app } = await setup(false);
		for (const scope of ['user', 'organizer'])
			for (const method of ['GET', 'PUT'] as const) {
				const res = await app.inject({
					method,
					url: `/api/${scope}/notification-preferences`,
					...(method === 'PUT' ? { payload: { sales: false } } : {}),
				});
				expect(res.statusCode).toBe(401);
			}
		await app.close();
	});
	it('rejects organization preferences outside the authenticated organization', async () => {
		const { app } = await setup(true, false);
		const res = await app.inject({
			method: 'GET',
			url: '/api/organizer/notification-preferences',
			headers: sessionCookie(),
		});
		expect(res.statusCode).toBe(403);
		await app.close();
	});
	it('saves organization settings and rejects arbitrary recipient addresses', async () => {
		const { app } = await setup();
		const res = await app.inject({
			method: 'PUT',
			url: '/api/organizer/notification-preferences',
			headers: sessionCookie(),
			payload: { sales: false, payouts: true },
		});
		expect(res.statusCode).toBe(200);
		expect(res.json()).toMatchObject({ settings: { sales: false, payouts: true } });
		const invalid = await app.inject({
			method: 'PUT',
			url: '/api/organizer/notification-preferences',
			headers: sessionCookie(),
			payload: { recipient: 'anyone@example.test' },
		});
		expect(invalid.statusCode).toBe(422);
		await app.close();
	});
	it('requires organization read permission to view and update permission to change settings', () => {
		expect(organizationRoutePolicy('GET', '/api/organizer/notification-preferences')).toMatchObject({
			actions: ['organization.read'],
		});
		expect(organizationRoutePolicy('PUT', '/api/organizer/notification-preferences')).toMatchObject({
			actions: ['organization.update'],
		});
	});
});
