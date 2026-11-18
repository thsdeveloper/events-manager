import multipart from '@fastify/multipart';
import { describe, it, expect, vi } from 'vitest';
import { receivingAccountRoutes } from '../src/routes/receiving-accounts.js';
import {
	buildRouteTestApp,
	createSupabaseClientsStub,
	sessionCookie,
	TEST_USER_ID,
	TEST_ORGANIZER_ID,
} from './support/index.js';
const documentId = '10000000-0000-4000-8000-000000000010';
const doc = {
	id: documentId,
	organizer_id: TEST_ORGANIZER_ID,
	kind: 'representative_identity',
	filename: 'identity.pdf',
	mime_type: 'application/pdf',
	size: 100,
	storage_path: `${TEST_ORGANIZER_ID}/${documentId}`,
};
const owner = `/api/organizer/receiving-accounts/${TEST_ORGANIZER_ID}`,
	admin = `/api/super-admin/organizers/${TEST_ORGANIZER_ID}/receiving-account`;
async function setup({
	role = 'organizer',
	ownerId = TEST_USER_ID,
	document = doc,
	allowed = true,
}: { role?: string | null; ownerId?: string; document?: typeof doc | null; allowed?: boolean } = {}) {
	const stub = createSupabaseClientsStub({
		user: role ? { id: TEST_USER_ID, email: 'ana@example.com' } : null,
		tables: {
			organizers: { data: { id: TEST_ORGANIZER_ID, user_id: ownerId, status: 'active', document: '52998224725' } },
			profiles: { data: { role, status: 'active' } },
			organizer_receiving_documents: { data: document },
		},
		rpc: { data: allowed },
	});
	const download = vi.fn().mockResolvedValue({ data: new Blob(['%PDF-private']), error: null });
	Object.assign(stub.storageBucket, { download });
	const app = await buildRouteTestApp(async (app) => {
		await app.register(multipart);
		await app.register(receivingAccountRoutes, { clients: stub.clients });
	}, {});
	return { app, stub, download };
}
function upload(content = '%PDF-file', mime = 'application/pdf', filename = 'identity.pdf') {
	return {
		method: 'POST' as const,
		url: `${owner}/documents?kind=representative_identity`,
		headers: { ...sessionCookie(), 'content-type': 'multipart/form-data; boundary=document' },
		payload: `--document\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n${content}\r\n--document--\r\n`,
	};
}
describe('private organizer verification documents', () => {
	it('stores a valid PDF only in the private bucket and never returns a public URL or storage path', async () => {
		const { app, stub } = await setup({ document: { ...doc, storage_path: undefined } as unknown as typeof doc });
		const r = await app.inject(upload());
		expect(r.statusCode).toBe(201);
		expect(stub.storage.from).toHaveBeenCalledWith('organizer-verification');
		expect(stub.storageBucket.getPublicUrl).not.toHaveBeenCalled();
		expect(r.json().url).toBeUndefined();
		expect(r.json().document.storage_path).toBeUndefined();
	});
	it.each([
		['<script>bad</script>', 'application/pdf'],
		['<svg/>', 'image/svg+xml'],
	])('rejects spoofed or active file content', async (content, mime) => {
		const { app, stub } = await setup();
		expect((await app.inject(upload(content, mime))).statusCode).toBe(422);
		expect(stub.storageBucket.upload).not.toHaveBeenCalled();
	});
	it('rejects oversized documents before storing them', async () => {
		const { app, stub } = await setup();
		expect((await app.inject(upload('%PDF-' + 'a'.repeat(10 * 1024 * 1024)))).statusCode).toBe(413);
		expect(stub.storageBucket.upload).not.toHaveBeenCalled();
	});
	it.each([
		{ role: null, expected: 401 },
		{ role: 'organizer', ownerId: 'other-user', expected: 403 },
		{ role: 'organizer', allowed: false, expected: 429 },
	])('guards document uploads: %j', async (options) => {
		const { app, stub } = await setup(options);
		expect((await app.inject(upload())).statusCode).toBe(options.expected);
		expect(stub.storageBucket.upload).not.toHaveBeenCalled();
	});
	it.each([
		['organizer', owner],
		['super_admin', admin],
	])('downloads privately for an authorized %s', async (role, url) => {
		const { app } = await setup({ role });
		const r = await app.inject({ method: 'GET', url: `${url}/documents/${documentId}`, headers: sessionCookie() });
		expect(r.statusCode).toBe(200);
		expect(r.body).toBe('%PDF-private');
		expect(r.headers['cache-control']).toContain('no-store');
		expect(r.headers['content-disposition']).toContain('attachment');
		expect(r.headers['content-security-policy']).toContain('sandbox');
	});
	it('does not serve a document attached to a different organization', async () => {
		const { app, download } = await setup({ document: { ...doc, organizer_id: 'different-org' } });
		const r = await app.inject({ method: 'GET', url: `${owner}/documents/${documentId}`, headers: sessionCookie() });
		expect(r.statusCode).toBe(404);
		expect(download).not.toHaveBeenCalled();
	});
	it.each([null, 'organizer'])('protects admin document access from %s', async (role) => {
		const { app, download } = await setup({ role });
		expect(
			(await app.inject({ method: 'GET', url: `${admin}/documents/${documentId}`, headers: sessionCookie() }))
				.statusCode,
		).toBe(role ? 403 : 401);
		expect(download).not.toHaveBeenCalled();
	});
	it('validates document identifiers before storage access', async () => {
		const { app, download } = await setup();
		expect(
			(await app.inject({ method: 'GET', url: `${owner}/documents/invalid`, headers: sessionCookie() })).statusCode,
		).toBe(422);
		expect(download).not.toHaveBeenCalled();
	});
});
