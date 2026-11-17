import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { createTestEnv } from './support/index.js';

const apps: FastifyInstance[] = [];
afterEach(async () => {
	await Promise.all(apps.splice(0).map((app) => app.close()));
});

async function setup() {
	const app = await buildApp(createTestEnv());
	apps.push(app);
	app.post('/api/security-probe', async () => ({ saved: true }));
	app.get('/api/security-probe', async (_request, reply) =>
		reply.header('cache-control', 'public, max-age=60').send({ ok: true }),
	);
	return app;
}

describe('browser request security', () => {
	it.each(['https://evil.example', 'http://evil.localhost:3003', 'null', 'http://localhost:3003.evil.example'])(
		'rejects writes from an untrusted Origin: %s',
		async (origin) => {
			const app = await setup();
			const response = await app.inject({
				method: 'POST',
				url: '/api/security-probe',
				headers: { origin, cookie: 'access_token=valid-session' },
			});
			expect(response.statusCode).toBe(403);
			expect(response.json().title).toBe('UNTRUSTED_ORIGIN');
		},
	);

	it.each(['same-site', 'cross-site'])('rejects %s browser writes without Origin', async (site) => {
		const app = await setup();
		const response = await app.inject({
			method: 'POST',
			url: '/api/security-probe',
			headers: { 'sec-fetch-site': site },
		});
		expect(response.statusCode).toBe(403);
	});

	it.each([{ origin: 'http://localhost:3003' }, {}, { authorization: 'Bearer native-client' }])(
		'permits trusted browser and server requests: %j',
		async (headers) => {
			const app = await setup();
			const response = await app.inject({ method: 'POST', url: '/api/security-probe', headers });
			expect(response.statusCode).toBe(200);
		},
	);

	it('does not interfere with public reads from another origin', async () => {
		const app = await setup();
		const response = await app.inject({ url: '/api/security-probe', headers: { origin: 'https://external.example' } });
		expect(response.statusCode).toBe(200);
	});

	it.each([{ cookie: 'access_token=session' }, { authorization: 'Bearer session' }])(
		'prevents shared caching of authenticated responses',
		async (headers) => {
			const app = await setup();
			const response = await app.inject({ url: '/api/security-probe', headers });
			expect(response.headers['cache-control']).toBe('private, no-store');
		},
	);

	it('does not echo query secrets in problem responses', async () => {
		const app = await setup();
		app.get('/api/security-error', () => {
			throw new Error('failure');
		});
		const response = await app.inject({ url: '/api/security-error?webhookSecret=never-expose-this' });
		expect(response.statusCode).toBe(500);
		expect(response.body).not.toContain('never-expose-this');
		expect(response.json().instance).toBe('/api/security-error');
	});
});
