import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { SupabaseClients } from '../src/infrastructure/supabase/clients.js';
import { organizerRoutes } from '../src/routes/organizers.js';
import { financeRoutes } from '../src/routes/finance.js';
import { adminRoutes } from '../src/routes/admin.js';
import { eventRoutes } from '../src/routes/events.js';
import type { PaymentGateway } from '../src/application/payments/payment-gateway.js';
import {
	buildRouteTestApp,
	createSupabaseClientsStub,
	createTestEnv,
	partialMock,
	TEST_USER_ID,
} from './support/index.js';

const org = '00000000-0000-4000-8000-000000000001';
const first = '00000000-0000-4000-8000-000000000002';
const second = '00000000-0000-4000-8000-000000000003';
const foreign = '00000000-0000-4000-8000-000000000004';
const events = [
	{ id: first, title: 'Congresso', organizer_id: org, status: 'published' },
	{ id: second, title: 'Oficina', organizer_id: org, status: 'draft' },
	{ id: foreign, title: 'Outra organização', organizer_id: 'foreign', status: 'published' },
];
const registrations = events.map((event, index) => ({
	id: `registration-${index}`,
	event_id: event,
	participant_name: `Pessoa ${index}`,
	participant_email: `p${index}@example.com`,
	payment_status: 'paid',
	status: 'confirmed',
	quantity: index + 1,
	total_amount: 100 * (index + 1),
	payment_amount: 90 * (index + 1),
	date_created: '2026-11-17T12:00:00Z',
}));
const nominalTickets = registrations.map((registration, index) => ({
	id: `00000000-0000-4000-8000-00000000001${index}`,
	event_id: registration.event_id.id,
	event: registration.event_id,
	registration,
	attendee_name: `Pessoa ${index}`,
	attendee_email: `p${index}@example.com`,
	ticket_code: `EVT-${index}`,
	sequence: 1,
}));

// Network double applying the filters sent to PostgREST to isolated fixture rows.
function query(rows: Record<string, any>[]) {
	let result = rows;
	let single = false;
	const value = (row: Record<string, any>, key: string) => {
		const field = key.split('.').reduce((item, part) => item?.[part], row);
		return typeof field === 'object' && field !== null ? field.id : field;
	};
	const builder: any = new Proxy(
		{},
		{
			get: (_target, key) => {
				if (key === 'then')
					return (resolve: (result: unknown) => void) =>
						resolve({ data: single ? (result[0] ?? null) : result, count: result.length, error: null });
				return (...args: any[]) => {
					if (key === 'eq') result = result.filter((row) => value(row, args[0]) === args[1]);
					if (key === 'in') result = result.filter((row) => args[1].includes(value(row, args[0])));
					if (key === 'maybeSingle' || key === 'single') single = true;
					return builder;
				};
			},
		},
	);
	return builder;
}
const apps: FastifyInstance[] = [];
afterEach(async () => {
	await Promise.all(apps.splice(0).map((app) => app.close()));
});
async function setup() {
	const { clients } = createSupabaseClientsStub({ user: { id: TEST_USER_ID, email: 'owner@example.com' } });
	const tables: Record<string, Record<string, any>[]> = {
		organizers: [{ id: org, user_id: TEST_USER_ID, status: 'active' }],
		events,
		event_registrations: registrations,
		registration_tickets: nominalTickets,
		event_tickets: events.map((event) => ({
			id: `type-${event.id}`,
			title: event.title,
			event_id: event.id,
			quantity: 10,
		})),
		event_drafts: [{ id: 'draft', organizer_id: org, user_id: TEST_USER_ID }],
		payment_transactions: registrations.map((registration) => ({
			id: `payment-${registration.id}`,
			registration_id: registration,
			status: 'succeeded',
		})),
	};
	const from = vi.fn((table: string) => query(tables[table] ?? []));
	const rpc = vi.fn(async (_name: string, args: { target_event?: string }) => ({
		data: {
			metrics: {
				totalEvents: args.target_event ? 1 : 2,
				publishedEvents: 1,
				upcomingEvents: 0,
				participants: 0,
				ticketsSold: 0,
				grossRevenue: 0,
			},
			recentEvents: [],
		},
		error: null,
	}));
	const database = { ...clients, admin: { ...clients.admin, from, rpc } } as unknown as SupabaseClients;
	const app = await buildRouteTestApp(async (app) => {
		await organizerRoutes(app, { clients: database, env: createTestEnv() });
		await financeRoutes(app, {
			clients: database,
			env: createTestEnv(),
			payments: partialMock<PaymentGateway>({ provider: 'mock' }),
		});
		await adminRoutes(app, { clients: database });
		await eventRoutes(app, { clients: database });
	}, {});
	apps.push(app);
	return { app, from };
}
const headers = { cookie: `access_token=test; active_organizer_id=${org}; active_event=${org}:${first}` };

describe('dados administrativos no evento selecionado', () => {
	it('mantém todos os eventos próprios no seletor mesmo quando a listagem está filtrada', async () => {
		const { app } = await setup();
		const selection = await app.inject({ url: '/api/organizer/event-selection', headers });
		expect(selection.json()).toMatchObject({ selectedEventId: first, events: [{ id: first }, { id: second }] });
		const list = await app.inject({ url: '/api/events', headers });
		expect(list.json().data.map((event: { id: string }) => event.id)).toEqual([first]);
	});
	it('filtra os indicadores do dashboard e as estatísticas da organização', async () => {
		const { app } = await setup();
		expect((await app.inject({ url: '/api/admin/dashboard', headers })).json().metrics.totalEvents).toBe(1);
		expect((await app.inject({ url: '/api/organizer/stats', headers })).json().stats).toMatchObject({
			totalEvents: 1,
			totalRegistrations: 1,
			totalRevenue: 90,
		});
	});
	it('aplica a seleção aos participantes, indicadores, ingressos e opções, acima do filtro local', async () => {
		const { app } = await setup();
		const participants = await app.inject({ url: `/api/admin/participantes?eventIds=${second}`, headers });
		expect(participants.json()).toMatchObject({
			data: [{ id: nominalTickets[0].id }],
			meta: { total: 1 },
			metrics: { total: 1 },
		});
		const options = await app.inject({ url: '/api/admin/participantes/filter-options', headers });
		expect(options.json().events.map((event: { id: string }) => event.id)).toEqual([first]);
		const tickets = await app.inject({ url: `/api/admin/ingressos?eventIds=${second}`, headers });
		expect(tickets.json().data.map((ticket: { id: string }) => ticket.id)).toEqual([`type-${first}`]);
	});
	it('restringe métricas, transações e gráficos financeiros ao evento', async () => {
		const { app } = await setup();
		const overview = await app.inject({ url: `/api/organizer/finance/overview?event_id=${second}`, headers });
		expect(overview.json().metrics).toMatchObject({ gross: 100, ticketsSold: 1, totalTransactions: 1 });
		const transactions = await app.inject({ url: `/api/organizer/finance/transactions?event_id=${second}`, headers });
		expect(transactions.json().data.map((item: { id: string }) => item.id)).toEqual(['payment-registration-0']);
		const analytics = await app.inject({
			url: `/api/organizer/analytics?start_date=2026-11-01&end_date=2026-11-30&event_id=${second}`,
			headers,
		});
		expect(analytics.json().kpi.totalRevenue).toBe(90);
		expect(analytics.json().activeEvents.map((event: { id: string }) => event.id)).toEqual([first]);
	});
	it('exporta somente os participantes e vendas do evento selecionado', async () => {
		const { app } = await setup();
		for (const url of ['/api/admin/participantes/export', '/api/organizer/finance/export']) {
			const response = await app.inject({ url, headers });
			expect(response.statusCode).toBe(200);
			expect(response.body).toContain('Pessoa 0');
			expect(response.body).not.toContain('Pessoa 1');
			expect(response.body).not.toContain('Pessoa 2');
		}
	});
	it('não entrega saldo e saques da organização na visão por evento', async () => {
		const { app, from } = await setup();
		const response = await app.inject({ url: '/api/organizer/finance/payouts', headers });
		expect(response.json()).toEqual({ balance: null, payouts: [] });
		expect(from).not.toHaveBeenCalledWith('organizer_payouts');
	});
	it('todos os eventos restaura os totais próprios sem incluir outra organização', async () => {
		const { app } = await setup();
		const response = await app.inject({
			url: '/api/organizer/finance/overview',
			headers: { cookie: 'access_token=test' },
		});
		expect(response.json().metrics).toMatchObject({ gross: 300, ticketsSold: 3, totalTransactions: 2 });
	});
	it('não mostra rascunhos independentes nem detalhes de outro evento ao filtrar', async () => {
		const { app } = await setup();
		expect((await app.inject({ url: '/api/event-drafts', headers })).json().data).toEqual([]);
		expect((await app.inject({ url: `/api/admin/participantes/${nominalTickets[1].id}`, headers })).statusCode).toBe(
			404,
		);
		expect((await app.inject({ url: `/api/events/${second}`, headers })).statusCode).toBe(404);
	});
});
