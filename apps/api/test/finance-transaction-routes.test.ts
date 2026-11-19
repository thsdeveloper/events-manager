import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { IamAccess } from '@events-manager/contracts';
import { financeRoutes } from '../src/routes/finance.js';
import type { PaymentGateway } from '../src/application/payments/payment-gateway.js';
import {
	buildRouteTestApp,
	createSupabaseClientsStub,
	createTestEnv,
	partialMock,
	sessionCookie,
	TEST_USER_ID,
} from './support/index.js';
const org = '00000000-0000-4000-8000-000000000001';
const event = '00000000-0000-4000-8000-000000000002';
const id = '00000000-0000-4000-8000-000000000003';
const registration = {
	id: 'order',
	event_id: { id: event, title: 'Congresso', organizer_id: org },
	participant_name: 'Ana',
	payment_status: 'paid',
	total_amount: 500,
	quantity: 2,
	additional_info: { cardToken: 'secret' },
};
const movement = {
	id,
	registration_id: registration,
	status: 'pending',
	event_type: 'transparent.reconciled_paid',
	amount: 250,
	metadata: { token: 'secret' },
};
const apps: FastifyInstance[] = [];
afterEach(async () => {
	await Promise.all(apps.splice(0).map((app) => app.close()));
});
async function setup({
	user = true,
	organizer = true,
	found = true,
	scope = null,
}: { user?: boolean; organizer?: boolean; found?: boolean; scope?: string[] | null } = {}) {
	const { clients, from } = createSupabaseClientsStub({
		user: user ? { id: TEST_USER_ID, email: 'ana@example.test' } : null,
		tables: {
			profiles: { data: { id: TEST_USER_ID, status: 'active', role: 'organizer' } },
			organizers: { data: organizer ? [{ id: org, user_id: TEST_USER_ID, status: 'active' }] : [] },
			event_registrations: { data: [registration] },
			payment_transactions: [{ data: found ? movement : null }, { data: [movement] }],
			payment_installments: {
				data: [
					{
						id: 'i1',
						installment_number: 1,
						total_installments: 2,
						amount: 250,
						status: 'paid',
						pix_copy_paste: 'private-pix',
					},
				],
			},
			registration_tickets: {
				data: [
					{
						id: 'ticket',
						sequence: 1,
						attendee_name: 'Ana',
						attendee_email: 'ana@example.test',
						ticket_code: 'EVT-123',
						is_buyer: true,
					},
				],
			},
		},
	});
	const app = await buildRouteTestApp(async (app) => {
		if (scope !== null)
			app.addHook('preHandler', async (request) => {
				request.iam = { eventIds: scope, access: {} as IamAccess };
			});
		await financeRoutes(app, {
			clients,
			env: createTestEnv(),
			payments: partialMock<PaymentGateway>({ provider: 'mock' }),
		});
	}, {});
	apps.push(app);
	return { app, from };
}
describe('GET finance transaction details', () => {
	it('returns the paid movement, order, participants and installment history without raw gateway payloads', async () => {
		const { app } = await setup();
		const response = await app.inject({ url: `/api/organizer/finance/transactions/${id}`, headers: sessionCookie() });
		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({
			transaction: { id, status: 'succeeded', settlement_status: 'pending', amount: 250, organizer_net: null },
			registration: { id: 'order', total_amount: 500 },
			event: { id: event },
			installments: [{ id: 'i1', status: 'paid' }],
			tickets: [{ attendee_name: 'Ana' }],
			movements: [{ id }],
		});
		expect(response.body).not.toContain('secret');
		expect(response.body).not.toContain('private-pix');
	});
	it('requires authentication', async () => {
		const { app } = await setup({ user: false });
		expect((await app.inject({ url: `/api/organizer/finance/transactions/${id}` })).statusCode).toBe(401);
	});
	it('requires organization access', async () => {
		const { app } = await setup({ organizer: false });
		expect(
			(await app.inject({ url: `/api/organizer/finance/transactions/${id}`, headers: sessionCookie() })).statusCode,
		).toBe(403);
	});
	it('validates the transaction identifier', async () => {
		const { app } = await setup();
		expect(
			(await app.inject({ url: '/api/organizer/finance/transactions/invalid', headers: sessionCookie() })).statusCode,
		).toBe(422);
	});
	it('does not reveal transactions belonging to another organization', async () => {
		const { app, from } = await setup({ found: false });
		expect(
			(await app.inject({ url: `/api/organizer/finance/transactions/${id}`, headers: sessionCookie() })).statusCode,
		).toBe(404);
		expect(from).not.toHaveBeenCalledWith('registration_tickets');
	});
	it('honors the event permission scope before reading transaction details', async () => {
		const { app, from } = await setup({ scope: ['another-event'] });
		expect(
			(await app.inject({ url: `/api/organizer/finance/transactions/${id}`, headers: sessionCookie() })).statusCode,
		).toBe(404);
		expect(from).not.toHaveBeenCalledWith('payment_transactions');
	});
});
