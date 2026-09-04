import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
	createClient: () => ({
		from: () => ({ select: () => ({ limit: async () => ({ data: [], error: null }) }) }),
		auth: { getUser: vi.fn() },
	}),
}));

import { buildApp } from '../src/app.js';
import { createTestEnv } from './support/index.js';
import { ApiError } from '../src/shared/errors.js';

const env = createTestEnv();

describe('GET /health', () => {
	afterEach(() => vi.restoreAllMocks());

	it('returns API and database health', async () => {
		const app = await buildApp(env);
		const response = await app.inject({ method: 'GET', url: '/health' });
		await app.close();

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({ status: 'ok', database: 'connected' });
		expect(response.headers['x-request-id']).toBeTruthy();
	});
});

describe('API boundaries', () => {
	it('preserves native Fastify client errors instead of returning 500', async () => {
		const app = await buildApp(env);
		const response = await app.inject({
			method: 'POST',
			url: '/api/v1/admin/login',
			headers: { 'content-type': 'application/json' },
			payload: '',
		});
		await app.close();

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({ status: 400, title: 'BAD_REQUEST' });
	});

	it('rejects protected routes without a session', async () => {
		const app = await buildApp(env);
		const response = await app.inject({ method: 'GET', url: '/api/events' });
		await app.close();

		expect(response.statusCode).toBe(401);
		expect(response.headers['content-type']).toContain('application/problem+json');
		expect(response.json()).toMatchObject({ status: 401, title: 'UNAUTHORIZED' });
	});

	it('returns validation details for malformed credentials', async () => {
		const app = await buildApp(env);
		const response = await app.inject({
			method: 'POST',
			url: '/api/auth/login',
			payload: { email: 'invalid', password: 'short' },
		});
		await app.close();

		expect(response.statusCode).toBe(422);
		expect(response.json()).toMatchObject({ status: 422, title: 'VALIDATION_ERROR' });
	});

	it('does not expose internal error details', async () => {
		const app = await buildApp(env);
		app.get('/test/internal-error', async () => {
			throw new Error('password=secret database connection failed');
		});
		const response = await app.inject({ method: 'GET', url: '/test/internal-error' });
		await app.close();

		expect(response.statusCode).toBe(500);
		expect(response.json().detail).toBe('Ocorreu um erro interno. Tente novamente em alguns instantes.');
		expect(response.body).not.toContain('password=secret');
	});

	it('keeps the detail of a 5xx problem the application chose to expose', async () => {
		const app = await buildApp(env);
		app.get('/test/unavailable', async () => {
			throw new ApiError(
				'O envio de SMS não está configurado neste ambiente.',
				503,
				'SMS_PROVIDER_UNAVAILABLE',
				undefined,
				{
					exposeDetail: true,
				},
			);
		});
		const response = await app.inject({ method: 'GET', url: '/test/unavailable' });
		await app.close();

		expect(response.statusCode).toBe(503);
		expect(response.json().detail).toBe('O envio de SMS não está configurado neste ambiente.');
	});

	it('returns the retry window for throttled operations', async () => {
		const app = await buildApp(env);
		app.get('/test/rate-limit', async () => {
			throw new ApiError('Aguarde.', 429, 'RATE_LIMITED');
		});
		const response = await app.inject({ method: 'GET', url: '/test/rate-limit' });
		await app.close();

		expect(response.statusCode).toBe(429);
		expect(response.headers['retry-after']).toBe('60');
		expect(response.json()).toMatchObject({ title: 'RATE_LIMITED', detail: 'Aguarde.' });
	});
});
