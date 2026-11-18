import { describe, expect, it, vi } from 'vitest';
import { superAdminRoutes } from '../src/routes/super-admin.js';
import type { PaymentGateway } from '../src/application/payments/payment-gateway.js';
import {
	buildRouteTestApp,
	createSupabaseClientsStub,
	partialMock,
	sessionCookie,
	TEST_USER_ID,
	TEST_ORGANIZER_ID,
} from './support/index.js';
const id = TEST_ORGANIZER_ID;
const organizer = {
	id,
	name: 'Produtora A',
	status: 'active',
	payout_status: 'pending_review',
	payout_pix_key: 'a@example.com',
	payout_pix_key_type: 'EMAIL',
};
async function setup(
	role: string | null = 'super_admin',
	result: unknown = { organizer, owner: { email: 'owner@example.com' }, metrics: { events: 3, availableBalance: 75 } },
) {
	const stub = createSupabaseClientsStub({
		user: role ? { id: TEST_USER_ID, email: 'admin@example.com' } : null,
		tables: {
			profiles: { data: { id: TEST_USER_ID, role, status: 'active' } },
			organizers: { data: organizer },
			audit_logs: { data: {} },
		},
		rpc: { data: result },
	});
	const app = await buildRouteTestApp(superAdminRoutes, {
		clients: stub.clients,
		payments: partialMock<PaymentGateway>({}),
	});
	return { app, stub };
}
describe('organizer support endpoints', () => {
	it('loads scoped organizer details and owner information', async () => {
		const { app, stub } = await setup();
		const response = await app.inject({
			method: 'GET',
			url: `/api/super-admin/organizers/${id}`,
			headers: sessionCookie(),
		});
		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({
			organizer: { id },
			owner: { email: 'owner@example.com' },
			metrics: { availableBalance: 75 },
		});
		expect(stub.clients.admin.rpc).toHaveBeenCalledWith('get_organizer_support_detail', { target_organizer: id });
	});
	it.each(['events', 'transactions', 'payouts', 'activity'])(
		'paginates %s within the requested organizer',
		async (kind) => {
			const { app, stub } = await setup('super_admin', { data: [{ id: 'record' }], total: 27 });
			const response = await app.inject({
				method: 'GET',
				url: `/api/super-admin/organizers/${id}/records?kind=${kind}&page=2&limit=10`,
				headers: sessionCookie(),
			});
			expect(response.statusCode).toBe(200);
			expect(response.json().pagination).toMatchObject({ page: 2, total: 27, pageCount: 3 });
			expect(stub.clients.admin.rpc).toHaveBeenCalledWith('list_organizer_support_records', {
				target_organizer: id,
				target_kind: kind,
				target_page: 2,
				target_limit: 10,
			});
		},
	);
	it('updates and audits the organizer atomically with the support reason and actor', async () => {
		const { app, stub } = await setup('super_admin', organizer);
		const response = await app.inject({
			method: 'PATCH',
			url: `/api/super-admin/organizers/${id}`,
			headers: sessionCookie(),
			payload: { status: 'archived', reason: 'Conta encerrada a pedido do responsável' },
		});
		expect(response.statusCode).toBe(200);
		expect(stub.clients.admin.rpc).toHaveBeenCalledWith(
			'update_organizer_support',
			expect.objectContaining({
				target_organizer: id,
				target_actor: TEST_USER_ID,
				target_patch: { status: 'archived' },
				target_reason: 'Conta encerrada a pedido do responsável',
			}),
		);
	});
	it('records an internal support note without modifying financial data', async () => {
		const { app, stub } = await setup();
		const response = await app.inject({
			method: 'POST',
			url: `/api/super-admin/organizers/${id}/notes`,
			headers: sessionCookie(),
			payload: { note: 'Responsável orientado a atualizar o telefone.' },
		});
		expect(response.statusCode).toBe(201);
		expect(stub.clients.admin.rpc).toHaveBeenCalledWith(
			'add_organizer_support_note',
			expect.objectContaining({
				target_organizer: id,
				target_actor: TEST_USER_ID,
				target_note: 'Responsável orientado a atualizar o telefone.',
			}),
		);
	});
	it.each([
		['GET', `/api/super-admin/organizers/not-an-id`, undefined],
		['GET', `/api/super-admin/organizers/${id}/records?kind=secrets`, undefined],
		['PATCH', `/api/super-admin/organizers/${id}`, { status: 'active' }],
		['POST', `/api/super-admin/organizers/${id}/notes`, { note: '' }],
	] as const)('validates %s %s', async (method, url, payload) => {
		const { app, stub } = await setup();
		const response = await app.inject({ method, url, headers: sessionCookie(), payload });
		expect(response.statusCode).toBe(422);
		expect(stub.clients.admin.rpc).not.toHaveBeenCalled();
	});
	it.each([
		['GET', ''],
		['GET', '/records?kind=events'],
		['PATCH', ''],
		['POST', '/notes'],
	] as const)('requires a superadmin for %s %s', async (method, suffix) => {
		for (const [role, status] of [
			[null, 401],
			['organizer', 403],
		] as const) {
			const { app, stub } = await setup(role);
			const response = await app.inject({
				method,
				url: `/api/super-admin/organizers/${id}${suffix}`,
				headers: sessionCookie(),
				...(method === 'PATCH'
					? { payload: { status: 'active', reason: 'Conferido' } }
					: method === 'POST'
						? { payload: { note: 'Conferido' } }
						: {}),
			});
			expect(response.statusCode).toBe(status);
			expect(stub.clients.admin.rpc).not.toHaveBeenCalled();
		}
	});
	it('returns 404 for an unknown organizer', async () => {
		const { app } = await setup('super_admin', null);
		const response = await app.inject({
			method: 'GET',
			url: `/api/super-admin/organizers/${id}`,
			headers: sessionCookie(),
		});
		expect(response.statusCode).toBe(404);
	});
	it('rejects legacy financial edits and forces review of the owner submission', async () => {
		const { app, stub } = await setup();
		vi.mocked(stub.clients.admin.rpc).mockResolvedValue({
			data: null,
			error: { message: 'PIX_REVIEW_CHANGED' },
		} as never);
		const response = await app.inject({
			method: 'PATCH',
			url: `/api/super-admin/organizers/${id}`,
			headers: sessionCookie(),
			payload: { payout_status: 'enabled', reviewed_pix_key: 'old@example.com', reason: 'Titularidade conferida' },
		});
		expect(response.statusCode).toBe(422);
		expect(stub.clients.admin.rpc).not.toHaveBeenCalled();
	});
});

it('applies name sorting, document search and pagination across the organizer list', async () => {
	const { app, stub } = await setup('super_admin', {
		data: [],
		pagination: { page: 2, limit: 20, total: 21, pageCount: 2 },
	});
	const response = await app.inject({
		method: 'GET',
		url: '/api/super-admin/organizers?search=45723174000110&sort=name&direction=asc&page=2&status=pending',
		headers: sessionCookie(),
	});
	expect(response.statusCode).toBe(200);
	expect(response.json().pagination.total).toBe(21);
	expect(stub.clients.admin.rpc).toHaveBeenCalledWith('list_organizer_support', {
		target_page: 2,
		target_limit: 20,
		target_search: '45723174000110',
		target_status: 'pending',
		target_sort: 'name',
		target_direction: 'asc',
	});
});
it('rejects unsupported server sorting', async () => {
	const { app, stub } = await setup();
	const response = await app.inject({
		method: 'GET',
		url: '/api/super-admin/organizers?sort=private_key',
		headers: sessionCookie(),
	});
	expect(response.statusCode).toBe(422);
	expect(stub.clients.admin.rpc).not.toHaveBeenCalled();
});
it('returns 404 when records refer to a missing organizer', async () => {
	const { app } = await setup('super_admin', null);
	const response = await app.inject({
		method: 'GET',
		url: `/api/super-admin/organizers/${id}/records?kind=events`,
		headers: sessionCookie(),
	});
	expect(response.statusCode).toBe(404);
});
it.each([
	['ORGANIZER_NOT_FOUND', 404],
	['PAYOUT_ACCOUNT_INVALID', 422],
	['unexpected database error', 500],
] as const)('handles persistence errors: %s', async (message, status) => {
	const { app, stub } = await setup();
	vi.mocked(stub.clients.admin.rpc).mockResolvedValue({ data: null, error: { message } } as never);
	const response = await app.inject({
		method: 'PATCH',
		url: `/api/super-admin/organizers/${id}`,
		headers: sessionCookie(),
		payload: { name: 'Correção', reason: 'Nome conferido no atendimento' },
	});
	expect(response.statusCode).toBe(status);
});
