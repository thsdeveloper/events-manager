import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { emailRoutes } from '../src/routes/email.js';
import { buildRouteTestApp, createSupabaseClientsStub, createTestEnv } from './support/index.js';

describe('public e-mail logo', () => {
	it.each([
		['no settings', { data: null }],
		['no uploaded logo', { data: { title: 'Flouvi', logo: null } }],
		['settings unavailable', { error: { message: 'database unavailable' } }],
	])('serves the Flouvi PNG without a session when there are %s', async (_scenario, settings) => {
		const { clients } = createSupabaseClientsStub({ tables: { site_settings: settings } });
		const app = await buildRouteTestApp(emailRoutes, { env: createTestEnv(), clients });
		try {
			const response = await app.inject({ method: 'GET', url: '/api/branding/logo' });
			expect(response.statusCode).toBe(200);
			expect(response.headers['content-type']).toBe('image/png');
			expect(response.headers['cache-control']).toBe('public, max-age=300');
			expect(await sharp(response.rawPayload).metadata()).toMatchObject({ format: 'png', width: 480 });
		} finally {
			await app.close();
		}
	});

	it('preserves the uploaded identity when a custom logo exists', async () => {
		const { clients } = createSupabaseClientsStub({
			tables: { site_settings: { data: { logo: { bucket: 'media', path: 'brand/logo.png' } } } },
		});
		const app = await buildRouteTestApp(emailRoutes, { env: createTestEnv(), clients });
		try {
			const response = await app.inject({ method: 'GET', url: '/api/branding/logo' });
			expect(response.statusCode).toBe(302);
			expect(response.headers.location).toBe('https://storage.test/media/brand/logo.png');
			expect(response.headers['cache-control']).toBe('public, max-age=300');
		} finally {
			await app.close();
		}
	});
});
