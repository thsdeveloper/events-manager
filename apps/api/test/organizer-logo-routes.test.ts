import multipart from '@fastify/multipart';
import { describe, expect, it } from 'vitest';
import { organizerRoutes } from '../src/routes/organizers.js';
import {
	buildRouteTestApp,
	createSupabaseClientsStub,
	createTestEnv,
	sessionCookie,
	TEST_USER_ID,
} from './support/index.js';

const organizer = {
	id: '60db9aad-71a6-4b21-a9dc-c7c56b2fb8a6',
	user_id: TEST_USER_ID,
	status: 'active',
	logo: { id: 'old-logo' },
};
async function setup(authenticated = true, hasOrganizer = true) {
	const stub = createSupabaseClientsStub({
		user: authenticated ? { id: TEST_USER_ID, email: 'ana@example.com' } : null,
		tables: {
			profiles: { data: { id: TEST_USER_ID, role: 'organizer', status: 'active' } },
			organizers: [{ data: hasOrganizer ? [organizer] : [] }, { data: organizer }],
			media_files: {
				data: { id: 'new-logo', filename: 'logo.png', bucket: 'media', path: 'owner/organizers/old.png' },
			},
		},
	});
	const app = await buildRouteTestApp(async (app) => {
		await app.register(multipart);
		await organizerRoutes(app, { env: createTestEnv(), clients: stub.clients });
	}, {});
	return { app, ...stub };
}
function imagePayload(type = 'image/png', content = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) {
	return Buffer.concat([
		Buffer.from(
			`--logo-boundary\r\nContent-Disposition: form-data; name="file"; filename="logo.png"\r\nContent-Type: ${type}\r\n\r\n`,
		),
		content,
		Buffer.from('\r\n--logo-boundary--\r\n'),
	]);
}

describe('organizer logo HTTP boundary', () => {
	it.each(['POST', 'DELETE'] as const)('%s requires authentication', async (method) => {
		const { app } = await setup(false);
		const response = await app.inject({ method, url: '/api/organizer/logo' });
		await app.close();
		expect(response.statusCode).toBe(401);
	});
	it.each(['POST', 'DELETE'] as const)('%s requires an owned active organization', async (method) => {
		const { app } = await setup(true, false);
		const response = await app.inject({ method, url: '/api/organizer/logo', headers: sessionCookie() });
		await app.close();
		expect(response.statusCode).toBe(403);
	});
	it('removes the stored object as well as the organization logo', async () => {
		const { app, storageBucket } = await setup();
		const response = await app.inject({ method: 'DELETE', url: '/api/organizer/logo', headers: sessionCookie() });
		await app.close();
		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({ success: true, cleanupPending: false });
		expect(storageBucket.remove).toHaveBeenCalledWith(['owner/organizers/old.png']);
	});
	it('uploads the new file and removes the previous object', async () => {
		const { app, storageBucket } = await setup();
		const response = await app.inject({
			method: 'POST',
			url: '/api/organizer/logo',
			headers: { ...sessionCookie(), 'content-type': 'multipart/form-data; boundary=logo-boundary' },
			payload: imagePayload(),
		});
		await app.close();
		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({ success: true, file: { file: { id: 'new-logo' } } });
		expect(storageBucket.upload).toHaveBeenCalledOnce();
		expect(storageBucket.remove).toHaveBeenCalledWith(['owner/organizers/old.png']);
	});
	it('rejects unsupported files before storing anything', async () => {
		const { app, storageBucket } = await setup();
		const response = await app.inject({
			method: 'POST',
			url: '/api/organizer/logo',
			headers: { ...sessionCookie(), 'content-type': 'multipart/form-data; boundary=logo-boundary' },
			payload: imagePayload('application/pdf', Buffer.from('%PDF-1.7')),
		});
		await app.close();
		expect(response.statusCode).toBe(422);
		expect(storageBucket.upload).not.toHaveBeenCalled();
	});
});
