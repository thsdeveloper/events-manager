import { describe, expect, it } from 'vitest';
import { ticketGroupRoutes } from '../src/routes/ticket-groups.js';
import { buildRouteTestApp, createSupabaseClientsStub, TEST_USER_ID, TEST_EVENT_ID } from './support/index.js';
const org = '00000000-0000-4000-8000-000000000002';
const group = '00000000-0000-4000-8000-000000000003';
const headers = { authorization: 'Bearer test-token' };
function stub(owned = true) {
	return createSupabaseClientsStub({
		user: { id: TEST_USER_ID, email: 'organizer@example.com' },
		tables: {
			organizers: { data: [{ id: org, status: 'active' }] },
			profiles: { data: null },
			events: { data: owned ? { id: TEST_EVENT_ID } : null },
			event_ticket_groups: { data: { id: group, event_id: TEST_EVENT_ID, title: 'Pista', parent_id: null, sort: 0 } },
			event_tickets: { data: [] },
		},
	});
}
describe('organizer ticket groups', () => {
	it('creates an independent group in an owned event', async () => {
		const { clients } = stub();
		const app = await buildRouteTestApp(ticketGroupRoutes, { clients });
		const res = await app.inject({
			method: 'POST',
			url: '/api/admin/eventos/' + TEST_EVENT_ID + '/grupos',
			headers,
			payload: { event_id: TEST_EVENT_ID, title: 'Pista' },
		});
		await app.close();
		expect(res.statusCode).toBe(201);
		expect(res.json()).toMatchObject({ id: group, title: 'Pista' });
	});
	it('requires authentication', async () => {
		const { clients } = stub();
		const app = await buildRouteTestApp(ticketGroupRoutes, { clients });
		const res = await app.inject({ method: 'GET', url: '/api/admin/eventos/' + TEST_EVENT_ID + '/grupos' });
		await app.close();
		expect(res.statusCode).toBe(401);
	});
	it('rejects another organizers event', async () => {
		const { clients } = stub(false);
		const app = await buildRouteTestApp(ticketGroupRoutes, { clients });
		const res = await app.inject({ method: 'GET', url: '/api/admin/eventos/' + TEST_EVENT_ID + '/grupos', headers });
		await app.close();
		expect(res.statusCode).toBe(403);
	});
	it('rejects an empty group title', async () => {
		const { clients } = stub();
		const app = await buildRouteTestApp(ticketGroupRoutes, { clients });
		const res = await app.inject({
			method: 'POST',
			url: '/api/admin/eventos/' + TEST_EVENT_ID + '/grupos',
			headers,
			payload: { event_id: TEST_EVENT_ID, title: '' },
		});
		await app.close();
		expect(res.statusCode).toBe(422);
	});
});

describe('ticket order persistence', () => {
	const first = '00000000-0000-4000-8000-000000000061';
	const second = '00000000-0000-4000-8000-000000000062';
	function orderStub() {
		return createSupabaseClientsStub({
			user: { id: TEST_USER_ID, email: 'organizer@example.com' },
			tables: {
				organizers: { data: [{ id: org, status: 'active' }] },
				profiles: { data: null },
				events: { data: { id: TEST_EVENT_ID } },
				event_tickets: { data: [{ id: first }, { id: second }] },
			},
		});
	}
	it('sends a validated complete order to the atomic database operation', async () => {
		const { clients } = orderStub();
		const app = await buildRouteTestApp(ticketGroupRoutes, { clients });
		const res = await app.inject({
			method: 'POST',
			url: '/api/admin/eventos/' + TEST_EVENT_ID + '/ingressos/ordem',
			headers,
			payload: { ticket_ids: [second, first] },
		});
		await app.close();
		expect(res.statusCode).toBe(200);
		expect(clients.admin.rpc).toHaveBeenCalledWith('reorder_event_tickets', {
			p_event_id: TEST_EVENT_ID,
			p_ticket_ids: [second, first],
		});
	});
	it('does not persist a partial set', async () => {
		const { clients } = orderStub();
		const app = await buildRouteTestApp(ticketGroupRoutes, { clients });
		const res = await app.inject({
			method: 'POST',
			url: '/api/admin/eventos/' + TEST_EVENT_ID + '/ingressos/ordem',
			headers,
			payload: { ticket_ids: [first] },
		});
		await app.close();
		expect(res.statusCode).toBe(422);
		expect(clients.admin.rpc).not.toHaveBeenCalled();
	});
	it('does not persist duplicated ids', async () => {
		const { clients } = orderStub();
		const app = await buildRouteTestApp(ticketGroupRoutes, { clients });
		const res = await app.inject({
			method: 'POST',
			url: '/api/admin/eventos/' + TEST_EVENT_ID + '/ingressos/ordem',
			headers,
			payload: { ticket_ids: [first, first] },
		});
		await app.close();
		expect(res.statusCode).toBe(422);
		expect(clients.admin.rpc).not.toHaveBeenCalled();
	});
});
