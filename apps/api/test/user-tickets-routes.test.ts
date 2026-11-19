/**
 * Rotas da área de ingressos da pessoa. Exercitam a rota real com o Supabase
 * substituído na borda: sessão, validação e autorização.
 */
import { describe, expect, it } from 'vitest';
import { userRoutes } from '../src/routes/users.js';
import {
	buildRouteTestApp,
	createSupabaseClientsStub,
	createTestEnv,
	sessionCookie,
	TEST_USER_ID,
} from './support/index.js';

const TICKET_ID = '00000000-0000-4000-8000-000000000070';

const ticketRow = {
	id: TICKET_ID,
	sequence: 1,
	ticket_code: 'EVT-1',
	attendee_name: null,
	attendee_email: null,
	attendee_phone: null,
	attendee_document: null,
	is_buyer: false,
	named_at: null,
	unit_price: 100,
	service_fee: 0,
	discount: 0,
	total_amount: 100,
	check_in_date: null,
	date_created: '2026-09-17T12:00:00.000Z',
	date_updated: '2026-09-17T12:00:00.000Z',
	registration: {
		id: '00000000-0000-4000-8000-000000000020',
		user_id: TEST_USER_ID,
		participant_name: 'Ana',
		participant_email: 'ana@events.local',
		status: 'confirmed',
		payment_status: 'paid',
		total_amount: 100,
		quantity: 1,
	},
	event: { id: '00000000-0000-4000-8000-000000000030', title: 'Congresso', slug: 'congresso' },
	ticket_type: { id: '00000000-0000-4000-8000-000000000060', title: 'Inteira', price: 100 },
};

/**
 * `registration_tickets` é lida em ordem: a listagem faz duas consultas (o que
 * a pessoa comprou e onde foi nomeada); a nomeação lê o ingresso e depois grava.
 */
function buildApp(options: { user?: boolean; found?: boolean; listing?: boolean } = {}) {
	const { user = true, found = true, listing = false } = options;
	const { clients } = createSupabaseClientsStub({
		user: user ? { id: TEST_USER_ID, email: 'ana@events.local' } : null,
		tables: {
			profiles: { data: { id: TEST_USER_ID, email: 'ana@events.local', role: 'attendee', status: 'active' } },
			organizers: { data: null },
			registration_tickets: listing
				? [{ data: [ticketRow] }, { data: [] }]
				: [{ data: found ? ticketRow : null }, { data: ticketRow }],
			email_deliveries: { data: null },
			payment_installments: { data: [] },
		},
	});

	return buildRouteTestApp(userRoutes, { clients, env: createTestEnv() });
}

describe('GET /api/user/tickets', () => {
	it('requires a session', async () => {
		const app = await buildApp({ user: false });

		const response = await app.inject({ method: 'GET', url: '/api/user/tickets' });

		expect(response.statusCode).toBe(401);
	});

	it('lists the nominal tickets the person bought or was named on', async () => {
		const app = await buildApp({ listing: true });

		const response = await app.inject({ method: 'GET', url: '/api/user/tickets', headers: sessionCookie() });

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual([expect.objectContaining({ id: TICKET_ID, can_edit_attendee: true })]);
	});
});

describe('PATCH /api/user/tickets/:id/attendee', () => {
	it('validates the attendee', async () => {
		const app = await buildApp();

		const response = await app.inject({
			method: 'PATCH',
			url: `/api/user/tickets/${TICKET_ID}/attendee`,
			headers: sessionCookie(),
			payload: { name: '', email: 'not-an-email' },
		});

		expect(response.statusCode).toBe(422);
	});

	it('answers 404 when the ticket is not in one of the person’s orders', async () => {
		const app = await buildApp({ found: false });

		const response = await app.inject({
			method: 'PATCH',
			url: `/api/user/tickets/${TICKET_ID}/attendee`,
			headers: sessionCookie(),
			payload: { name: 'Bia', email: 'bia@events.local' },
		});

		expect(response.statusCode).toBe(404);
	});
});

describe('GET /api/user/purchases/:id', () => {
	it('requires authentication', async () => {
		const app = await buildApp({ user: false });
		expect((await app.inject({ url: '/api/user/purchases/' + ticketRow.registration.id })).statusCode).toBe(401);
		await app.close();
	});
	it('validates the purchase identifier', async () => {
		const app = await buildApp();
		expect((await app.inject({ url: '/api/user/purchases/invalid', headers: sessionCookie() })).statusCode).toBe(422);
		await app.close();
	});
	it('returns the authenticated buyer’s purchase and installments', async () => {
		const app = await buildApp({ listing: true });
		const response = await app.inject({
			url: '/api/user/purchases/' + ticketRow.registration.id,
			headers: sessionCookie(),
		});
		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({
			id: ticketRow.registration.id,
			tickets: [{ id: TICKET_ID }],
			installments: [],
		});
		await app.close();
	});
	it('does not reveal another purchase', async () => {
		const app = await buildApp({ listing: true });
		const response = await app.inject({
			url: '/api/user/purchases/00000000-0000-4000-8000-000000000099',
			headers: sessionCookie(),
		});
		expect(response.statusCode).toBe(404);
		await app.close();
	});
});
