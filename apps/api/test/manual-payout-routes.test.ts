import multipart from '@fastify/multipart';
import { describe, it, expect, vi } from 'vitest';
import { manualPayoutRoutes } from '../src/routes/manual-payouts.js';
import {
	buildRouteTestApp,
	createSupabaseClientsStub,
	sessionCookie,
	TEST_USER_ID,
	TEST_ORGANIZER_ID,
} from './support/index.js';
const payout = '20000000-0000-4000-8000-000000000001',
	receipt = '30000000-0000-4000-8000-000000000001';
const base = `/api/super-admin/finance/payouts/${payout}`;
async function setup(role: string | null = 'super_admin', ownerId = TEST_USER_ID) {
	const stub = createSupabaseClientsStub({
		user: role ? { id: TEST_USER_ID, email: 'admin@example.com' } : null,
		tables: {
			profiles: { data: { id: TEST_USER_ID, role, status: 'active' } },
			organizer_payouts: {
				data: {
					id: payout,
					organizer_id: TEST_ORGANIZER_ID,
					provider: 'manual',
					status: 'pending',
					receipt_document_id: receipt,
				},
			},
			organizers: { data: { id: TEST_ORGANIZER_ID, user_id: ownerId, status: 'active' } },
			organizer_payout_receipts: {
				data: {
					id: receipt,
					payout_id: payout,
					filename: 'comprovante.pdf',
					mime_type: 'application/pdf',
					storage_path: 'private/receipt',
				},
			},
		},
		rpc: { data: { id: payout, status: 'completed' } },
	});
	const download = vi.fn().mockResolvedValue({ data: new Blob(['%PDF-private-receipt']), error: null });
	Object.assign(stub.storageBucket, { download });
	const app = await buildRouteTestApp(async (app) => {
		await app.register(multipart);
		await app.register(manualPayoutRoutes, { clients: stub.clients });
	}, {});
	return { stub, app, download };
}
describe('manual transfer settlement', () => {
	it('records completion only with a private receipt and an explicit confirmation', async () => {
		const { app, stub } = await setup();
		const r = await app.inject({
			method: 'POST',
			url: `${base}/complete`,
			headers: sessionCookie(),
			payload: { receipt_id: receipt, reference: 'TED-2026-001', confirmed_transfer: true },
		});
		expect(r.statusCode).toBe(200);
		expect(stub.clients.admin.rpc).toHaveBeenCalledWith(
			'finish_manual_payout',
			expect.objectContaining({
				target_payout: payout,
				target_actor: TEST_USER_ID,
				target_receipt: receipt,
				target_reference: 'TED-2026-001',
			}),
		);
	});
	it('cancels a reservation only after confirming no transfer was sent', async () => {
		const { app, stub } = await setup();
		expect(
			(
				await app.inject({
					method: 'POST',
					url: `${base}/cancel`,
					headers: sessionCookie(),
					payload: { reason: 'Transferência não realizada', confirmed_not_sent: true },
				})
			).statusCode,
		).toBe(200);
		expect(stub.clients.admin.rpc).toHaveBeenCalledWith(
			'finish_manual_payout',
			expect.objectContaining({ target_cancel_reason: 'Transferência não realizada', target_receipt: null }),
		);
	});
	it.each([
		{},
		{ receipt_id: receipt, reference: 'TED-001', confirmed_transfer: false },
		{ receipt_id: 'bad', reference: 'TED-001', confirmed_transfer: true },
	])('rejects incomplete settlement: %j', async (payload) => {
		const { app, stub } = await setup();
		expect(
			(await app.inject({ method: 'POST', url: `${base}/complete`, headers: sessionCookie(), payload })).statusCode,
		).toBe(422);
		expect(stub.clients.admin.rpc).not.toHaveBeenCalled();
	});
	it.each(['organizer', null])('protects manual operations from %s', async (role) => {
		const { app } = await setup(role);
		for (const endpoint of ['complete', 'cancel', 'receipt'])
			expect(
				(await app.inject({ method: 'POST', url: `${base}/${endpoint}`, headers: sessionCookie(), payload: {} }))
					.statusCode,
			).toBe(role ? 403 : 401);
	});
	it('returns private receipt URLs only after authentication and organization scoping', async () => {
		const { app } = await setup();
		const r = await app.inject({
			method: 'GET',
			url: `/api/super-admin/organizers/${TEST_ORGANIZER_ID}/manual-payouts?page=0`,
			headers: sessionCookie(),
		});
		expect(r.statusCode).toBe(422);
	});
	it('stores a receipt PDF in the private bucket', async () => {
		const { app, stub } = await setup();
		const r = await app.inject({
			method: 'POST',
			url: `${base}/receipt`,
			headers: { ...sessionCookie(), 'content-type': 'multipart/form-data; boundary=receipt' },
			payload:
				'--receipt\r\nContent-Disposition: form-data; name="file"; filename="comprovante.pdf"\r\nContent-Type: application/pdf\r\n\r\n%PDF-transfer\r\n--receipt--\r\n',
		});
		expect(r.statusCode).toBe(201);
		expect(stub.storage.from).toHaveBeenCalledWith('organizer-verification');
		expect(stub.storageBucket.getPublicUrl).not.toHaveBeenCalled();
		expect(r.headers['cache-control']).toContain('no-store');
	});
	it('requires a file when submitting the receipt', async () => {
		const { app, stub } = await setup();
		const r = await app.inject({
			method: 'POST',
			url: `${base}/receipt`,
			headers: { ...sessionCookie(), 'content-type': 'multipart/form-data; boundary=receipt' },
			payload: '--receipt--\r\n',
		});
		expect(r.statusCode).toBe(422);
		expect(stub.storageBucket.upload).not.toHaveBeenCalled();
	});
	it('requires the cancellation reason and confirmation', async () => {
		const { app, stub } = await setup();
		const r = await app.inject({
			method: 'POST',
			url: `${base}/cancel`,
			headers: sessionCookie(),
			payload: { reason: 'Erro', confirmed_not_sent: false },
		});
		expect(r.statusCode).toBe(422);
		expect(stub.clients.admin.rpc).not.toHaveBeenCalled();
	});
	it.each(['organizer', 'super_admin'])('serves the private receipt to its authorized %s', async (role) => {
		const { app } = await setup(role);
		const url =
			role === 'organizer'
				? `/api/organizer/receiving-accounts/${TEST_ORGANIZER_ID}/payouts/${payout}/receipt`
				: `/api/super-admin/organizers/${TEST_ORGANIZER_ID}/manual-payouts/${payout}/receipt`;
		const r = await app.inject({ method: 'GET', url, headers: sessionCookie() });
		expect(r.statusCode).toBe(200);
		expect(r.body).toBe('%PDF-private-receipt');
		expect(r.headers['cache-control']).toContain('no-store');
		expect(r.headers['content-disposition']).toContain('attachment');
		expect(r.headers['content-security-policy']).toContain('sandbox');
	});
	it('denies downloading another organizer’s receipt', async () => {
		const { app, download } = await setup('organizer', 'other-user');
		const r = await app.inject({
			method: 'GET',
			url: `/api/organizer/receiving-accounts/${TEST_ORGANIZER_ID}/payouts/${payout}/receipt`,
			headers: sessionCookie(),
		});
		expect(r.statusCode).toBe(403);
		expect(download).not.toHaveBeenCalled();
	});
	it.each([null, 'organizer'])('denies admin listing and receipt download for %s', async (role) => {
		const { app, download } = await setup(role);
		for (const suffix of ['', `/${payout}/receipt`]) {
			const r = await app.inject({
				method: 'GET',
				url: `/api/super-admin/organizers/${TEST_ORGANIZER_ID}/manual-payouts${suffix}`,
				headers: sessionCookie(),
			});
			expect(r.statusCode).toBe(role ? 403 : 401);
		}
		expect(download).not.toHaveBeenCalled();
	});
	it('validates payout identifiers before downloading receipts', async () => {
		const { app, download } = await setup();
		for (const url of [
			`/api/super-admin/organizers/${TEST_ORGANIZER_ID}/manual-payouts/invalid/receipt`,
			`/api/organizer/receiving-accounts/${TEST_ORGANIZER_ID}/payouts/invalid/receipt`,
		]) {
			expect((await app.inject({ method: 'GET', url, headers: sessionCookie() })).statusCode).toBe(422);
		}
		expect(download).not.toHaveBeenCalled();
	});
	it('lists bank transfers with pagination for support', async () => {
		const record = { id: payout, organizer_id: TEST_ORGANIZER_ID, method: 'bank_transfer', status: 'pending' };
		const stub = createSupabaseClientsStub({
			user: { id: TEST_USER_ID, email: 'admin@example.com' },
			tables: {
				profiles: { data: { role: 'super_admin', status: 'active' } },
				organizer_payouts: { data: [record], count: 11 },
			},
		});
		const app = await buildRouteTestApp(manualPayoutRoutes, { clients: stub.clients });
		const r = await app.inject({
			method: 'GET',
			url: `/api/super-admin/organizers/${TEST_ORGANIZER_ID}/manual-payouts?page=2&limit=10`,
			headers: sessionCookie(),
		});
		expect(r.statusCode).toBe(200);
		expect(r.json()).toEqual({ data: [record], pagination: { page: 2, limit: 10, total: 11, pageCount: 2 } });
		expect(r.headers['cache-control']).toContain('no-store');
	});
	it('requires a session to download an organizer receipt', async () => {
		const { app, download } = await setup(null);
		const r = await app.inject({
			method: 'GET',
			url: `/api/organizer/receiving-accounts/${TEST_ORGANIZER_ID}/payouts/${payout}/receipt`,
			headers: sessionCookie(),
		});
		expect(r.statusCode).toBe(401);
		expect(download).not.toHaveBeenCalled();
	});
});
