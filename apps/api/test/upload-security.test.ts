import multipart from '@fastify/multipart';
import { describe, expect, it } from 'vitest';
import { uploadRoutes } from '../src/routes/uploads.js';
import { buildRouteTestApp, createSupabaseClientsStub, sessionCookie, TEST_USER_ID } from './support/index.js';

async function setup(allowed: boolean, authenticated = true) {
	const stub = createSupabaseClientsStub({
		user: authenticated ? { id: TEST_USER_ID, email: 'ana@example.com' } : null,
		rpc: { data: allowed },
	});
	const app = await buildRouteTestApp(async (app) => {
		await app.register(multipart);
		await app.register(uploadRoutes, { clients: stub.clients });
	}, {});
	return { app, ...stub };
}

describe('upload abuse protection', () => {
	it('rejects uploads after the account allowance is exhausted, before storing bytes', async () => {
		const { app, storageBucket } = await setup(false);
		const response = await app.inject({ method: 'POST', url: '/api/upload', headers: sessionCookie() });
		await app.close();
		expect(response.statusCode).toBe(429);
		expect(response.json().title).toBe('RATE_LIMITED');
		expect(response.headers['retry-after']).toBeDefined();
		expect(storageBucket.upload).not.toHaveBeenCalled();
	});
	it('still validates files when the account has allowance', async () => {
		const { app } = await setup(true);
		const response = await app.inject({
			method: 'POST',
			url: '/api/upload',
			headers: { ...sessionCookie(), 'content-type': 'multipart/form-data; boundary=test' },
			payload: '--test--\r\n',
		});
		await app.close();
		expect(response.statusCode).toBe(400);
		expect(response.json().title).toBe('FILE_REQUIRED');
	});
	it('does not give anonymous callers an upload allowance', async () => {
		const { app, clients } = await setup(true, false);
		const response = await app.inject({ method: 'POST', url: '/api/upload' });
		await app.close();
		expect(response.statusCode).toBe(401);
		expect(clients.admin.rpc).not.toHaveBeenCalled();
	});
});
