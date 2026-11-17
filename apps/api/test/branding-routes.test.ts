import multipartPlugin from '@fastify/multipart';
import { describe, expect, it } from 'vitest';
import { superAdminRoutes } from '../src/routes/super-admin.js';
import type { PaymentGateway } from '../src/application/payments/payment-gateway.js';
import {
	buildRouteTestApp,
	createSupabaseClientsStub,
	partialMock,
	sessionCookie,
	TEST_USER_ID,
} from './support/index.js';
const MEDIA_ID = '00000000-0000-4000-8000-000000000010';
async function setup(
	role: string | null = 'super_admin',
	media: Record<string, unknown> = {},
	settings: Record<string, unknown> = {},
) {
	const stub = createSupabaseClientsStub({
		user: role ? { id: TEST_USER_ID, email: 'test@example.test' } : null,
		tables: {
			profiles: { data: { id: TEST_USER_ID, role, status: 'active' } },
			media_files: {
				data: {
					id: MEDIA_ID,
					filename: 'logo.svg',
					type: 'image/svg+xml',
					metadata: { branding_kind: 'logo' },
					...media,
				},
			},
			site_settings: { data: { id: 'site', logo: null, logo_dark_mode: null, ...settings } },
			audit_logs: { data: null },
		},
	});
	const app = await buildRouteTestApp(async (server) => {
		await server.register(multipartPlugin);
		await superAdminRoutes(server, { clients: stub.clients, payments: partialMock<PaymentGateway>({}) });
	}, {});
	return { app, stub };
}
const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M0 0H100V100H0Z"/></svg>';
function multipart(content: string) {
	return `--brand\r\nContent-Disposition: form-data; name="file"; filename="logo.svg"\r\nContent-Type: image/svg+xml\r\n\r\n${content}\r\n--brand--\r\n`;
}
describe('branding assets route', () => {
	it('accepts an SVG upload only for an active superadmin', async () => {
		const { app, stub } = await setup();
		const r = await app.inject({
			method: 'POST',
			url: '/api/super-admin/settings/branding/assets?kind=logo',
			headers: { ...sessionCookie(), 'content-type': 'multipart/form-data; boundary=brand' },
			payload: multipart(svg),
		});
		expect(r.statusCode).toBe(201);
		expect(r.json()).toMatchObject({ fileId: MEDIA_ID });
		expect(stub.storageBucket.upload).toHaveBeenCalled();
	});
	it.each([
		[null, 401],
		['organizer', 403],
	])('rejects role %s', async (role, status) => {
		const { app, stub } = await setup(role as string | null);
		const r = await app.inject({
			method: 'POST',
			url: '/api/super-admin/settings/branding/assets?kind=logo',
			headers: sessionCookie(),
		});
		expect(r.statusCode).toBe(status);
		expect(stub.storageBucket.upload).not.toHaveBeenCalled();
	});
	it('rejects active SVG content before storing it', async () => {
		const { app, stub } = await setup();
		const r = await app.inject({
			method: 'POST',
			url: '/api/super-admin/settings/branding/assets?kind=logo',
			headers: { ...sessionCookie(), 'content-type': 'multipart/form-data; boundary=brand' },
			payload: multipart(svg.replace('<path', '<script/> <path')),
		});
		expect(r.statusCode).toBe(422);
		expect(stub.storageBucket.upload).not.toHaveBeenCalled();
	});
	it('rejects an unknown asset category', async () => {
		const { app } = await setup();
		const r = await app.inject({
			method: 'POST',
			url: '/api/super-admin/settings/branding/assets?kind=banner',
			headers: sessionCookie(),
		});
		expect(r.statusCode).toBe(422);
	});
});
describe('branding settings update', () => {
	it('saves an app icon independently of the existing logos', async () => {
		const { app } = await setup('super_admin', {
			type: 'image/png',
			metadata: { branding_kind: 'app-icon', width: 1024, height: 1024 },
		});
		const r = await app.inject({
			method: 'PATCH',
			url: '/api/super-admin/settings/branding',
			headers: sessionCookie(),
			payload: { app_icon: MEDIA_ID },
		});
		expect(r.statusCode).toBe(200);
	});
	it('refuses a media asset that was not validated for the selected purpose', async () => {
		const { app } = await setup('super_admin', { type: 'image/png', metadata: {} });
		const r = await app.inject({
			method: 'PATCH',
			url: '/api/super-admin/settings/branding',
			headers: sessionCookie(),
			payload: { app_icon: MEDIA_ID },
		});
		expect(r.statusCode).toBe(422);
	});
	it.each([
		[null, 401],
		['organizer', 403],
	])('rejects settings edits by role %s', async (role, status) => {
		const { app } = await setup(role as string | null);
		const r = await app.inject({
			method: 'PATCH',
			url: '/api/super-admin/settings/branding',
			headers: sessionCookie(),
			payload: { app_icon: null },
		});
		expect(r.statusCode).toBe(status);
	});
	it('rejects a logo asset assigned as an app icon', async () => {
		const { app } = await setup();
		const r = await app.inject({
			method: 'PATCH',
			url: '/api/super-admin/settings/branding',
			headers: sessionCookie(),
			payload: { app_icon: MEDIA_ID },
		});
		expect(r.statusCode).toBe(422);
	});
	it('preserves a legacy raster logo when saving other identity settings', async () => {
		const { app } = await setup(
			'super_admin',
			{ type: 'image/png', metadata: {} },
			{ logo: { id: MEDIA_ID, type: 'image/png' } },
		);
		const r = await app.inject({
			method: 'PATCH',
			url: '/api/super-admin/settings/branding',
			headers: sessionCookie(),
			payload: { logo: MEDIA_ID, favicon_dark_mode: null },
		});
		expect(r.statusCode).toBe(200);
	});
	it('rejects a validated app icon with the wrong dimensions', async () => {
		const { app } = await setup('super_admin', {
			type: 'image/png',
			metadata: { branding_kind: 'app-icon', width: 128, height: 128 },
		});
		const r = await app.inject({
			method: 'PATCH',
			url: '/api/super-admin/settings/branding',
			headers: sessionCookie(),
			payload: { app_icon: MEDIA_ID },
		});
		expect(r.statusCode).toBe(422);
	});
});
