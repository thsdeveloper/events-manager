import { describe, expect, it, vi } from 'vitest';
import { receivingAccountRoutes } from '../src/routes/receiving-accounts.js';
import {
	buildRouteTestApp,
	createSupabaseClientsStub,
	sessionCookie,
	TEST_USER_ID,
	TEST_ORGANIZER_ID,
} from './support/index.js';
const id = TEST_ORGANIZER_ID;
const requestId = '10000000-0000-4000-8000-000000000010';
const documentId = '10000000-0000-4000-8000-000000000001';
const docs = [documentId, '10000000-0000-4000-8000-000000000002'];
const ownerUrl = `/api/organizer/receiving-accounts/${id}`;
const adminUrl = `/api/super-admin/organizers/${id}/receiving-account`;
const body = {
	account: {
		method: 'pix',
		holder_name: 'Ana Silva',
		holder_document: '52998224725',
		pix_key_type: 'EMAIL',
		pix_key: 'ana@example.com',
	},
	document_ids: docs,
	expected_request_id: null,
	confirm_ownership: true,
};
async function setup(role: string | null = 'organizer', overrides: Record<string, unknown> = {}) {
	const stub = createSupabaseClientsStub({
		user: role ? { id: TEST_USER_ID, email: 'ana@example.com' } : null,
		tables: {
			profiles: { data: { id: TEST_USER_ID, role, status: 'active' } },
			organizers: {
				data: { id, user_id: TEST_USER_ID, name: 'Ana', document: '52998224725', status: 'pending', ...overrides },
			},
		},
		rpc: { data: { organizer: { id }, current: null, history: [], pagination: { page: 1, total: 0 } } },
	});
	const app = await buildRouteTestApp(receivingAccountRoutes, { clients: stub.clients });
	return { app, stub };
}
describe('receiving account boundaries', () => {
	it('lets a pending organizer access onboarding without an active workspace', async () => {
		const { app } = await setup();
		const r = await app.inject({ method: 'GET', url: ownerUrl, headers: sessionCookie() });
		expect(r.statusCode).toBe(200);
		expect(r.json()).toMatchObject({ organizer: { id }, history: [] });
		expect(r.headers['cache-control']).toContain('no-store');
	});
	it('submits a version with the authenticated owner and never trusts an actor from the body', async () => {
		const { app, stub } = await setup();
		const r = await app.inject({ method: 'POST', url: ownerUrl, headers: sessionCookie(), payload: body });
		expect(r.statusCode).toBe(201);
		expect(stub.clients.admin.rpc).toHaveBeenCalledWith(
			'submit_receiving_account',
			expect.objectContaining({ target_actor: TEST_USER_ID, target_organizer: id, target_document_ids: docs }),
		);
	});
	it('rejects a destination belonging to a different CPF/CNPJ', async () => {
		const { app, stub } = await setup();
		const r = await app.inject({
			method: 'POST',
			url: ownerUrl,
			headers: sessionCookie(),
			payload: { ...body, account: { ...body.account, holder_document: '45723174000110' } },
		});
		expect(r.statusCode).toBe(422);
		expect(stub.clients.admin.rpc).not.toHaveBeenCalled();
	});
	it.each(['GET', 'POST'] as const)('rejects unauthenticated %s', async (method) => {
		const { app } = await setup(null);
		expect(
			(await app.inject({ method, url: ownerUrl, payload: method === 'POST' ? body : undefined })).statusCode,
		).toBe(401);
	});
	it.each(['GET', 'POST'] as const)('isolates other organizations on %s', async (method) => {
		const { app, stub } = await setup('organizer', { user_id: 'other-owner' });
		expect(
			(
				await app.inject({
					method,
					url: ownerUrl,
					headers: sessionCookie(),
					payload: method === 'POST' ? body : undefined,
				})
			).statusCode,
		).toBe(403);
		expect(stub.clients.admin.rpc).not.toHaveBeenCalled();
	});
	it.each([
		{ ...body, status: 'approved' },
		{ ...body, confirm_ownership: false },
		{ ...body, document_ids: [] },
	])('validates a submission before writing', async (payload) => {
		const { app, stub } = await setup();
		expect((await app.inject({ method: 'POST', url: ownerUrl, headers: sessionCookie(), payload })).statusCode).toBe(
			422,
		);
		expect(stub.clients.admin.rpc).not.toHaveBeenCalled();
	});
	it('returns a conflict when a new version or already-used documents replace the form', async () => {
		const { app, stub } = await setup();
		vi.mocked(stub.clients.admin.rpc).mockResolvedValue({
			data: null,
			error: { message: 'RECEIVING_REQUEST_CHANGED' },
		} as never);
		const r = await app.inject({ method: 'POST', url: ownerUrl, headers: sessionCookie(), payload: body });
		expect(r.statusCode).toBe(409);
	});
	it('lets a super-admin load history and approve a specific version for their own organization', async () => {
		const { app, stub } = await setup('super_admin');
		expect((await app.inject({ method: 'GET', url: adminUrl, headers: sessionCookie() })).statusCode).toBe(200);
		const r = await app.inject({
			method: 'POST',
			url: `${adminUrl}/${requestId}/review`,
			headers: sessionCookie(),
			payload: { decision: 'approved', documents_checked: true, reason: 'Documentos e titularidade conferidos' },
		});
		expect(r.statusCode).toBe(200);
		expect(stub.clients.admin.rpc).toHaveBeenCalledWith(
			'review_receiving_account',
			expect.objectContaining({ target_request: requestId, target_actor: TEST_USER_ID, target_decision: 'approved' }),
		);
	});
	it('explains a denied review as missing permission without requiring a different reviewer', async () => {
		const { app, stub } = await setup('super_admin');
		stub.rpc.mockResolvedValue({ data: null, error: { message: 'RECEIVING_REVIEW_FORBIDDEN' } });
		const response = await app.inject({
			method: 'POST',
			url: `${adminUrl}/${requestId}/review`,
			headers: sessionCookie(),
			payload: { decision: 'approved', documents_checked: true, reason: 'Documentos e titularidade conferidos' },
		});
		expect(response.statusCode).toBe(403);
		expect(response.json()).toMatchObject({
			title: 'RECEIVING_REVIEW_FORBIDDEN',
			detail: 'Você não tem permissão para analisar os dados de recebimento.',
		});
	});
	it.each(['organizer', null])('protects admin decisions from %s', async (role) => {
		const { app } = await setup(role);
		for (const [method, url] of [
			['GET', adminUrl],
			['POST', `${adminUrl}/${requestId}/review`],
		] as const)
			expect(
				(
					await app.inject({
						method,
						url,
						headers: sessionCookie(),
						payload:
							method === 'POST' ? { decision: 'approved', documents_checked: true, reason: 'Conferido' } : undefined,
					})
				).statusCode,
			).toBe(role ? 403 : 401);
	});
	it('never accepts replacement bank or PIX data in the approval route', async () => {
		const { app } = await setup('super_admin');
		expect(
			(
				await app.inject({
					method: 'POST',
					url: `${adminUrl}/${requestId}/review`,
					headers: sessionCookie(),
					payload: { decision: 'approved', reason: 'Conferido', documents_checked: true, account: body.account },
				})
			).statusCode,
		).toBe(422);
	});
	it.each([`${ownerUrl}?page=0`, ownerUrl.replace(id, 'invalid')])('validates history parameters %s', async (url) => {
		const { app } = await setup();
		expect((await app.inject({ method: 'GET', url, headers: sessionCookie() })).statusCode).toBe(422);
	});
});
