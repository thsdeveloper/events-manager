import { createHmac } from 'node:crypto';
import { expect, it } from 'vitest';
import rawBody from 'fastify-raw-body';
import { paymentRoutes } from '../src/routes/payments.js';
import { AbacatePayGateway } from '../src/infrastructure/payments/abacatepay-gateway.js';
import { buildRouteTestApp, createSupabaseClientsStub, createTestEnv } from './support/index.js';
// Public integrity key from the provider; authentication also requires our private secret.
const publicKey =
	't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9';
const secret = 'local-webhook-private-secret';
async function setup() {
	const env = createTestEnv({
		PAYMENTS_MODE: 'abacatepay',
		ABACATEPAY_API_KEY: 'abc_dev_test',
		ABACATEPAY_WEBHOOK_SECRET: secret,
	});
	return buildRouteTestApp(async (app) => {
		await app.register(rawBody, { global: false, field: 'rawBody', encoding: false, runFirst: true });
		await paymentRoutes(app, {
			env,
			clients: createSupabaseClientsStub({ tables: { checkout_attempts: { data: null } } }).clients,
			payments: new AbacatePayGateway('abc_dev_test'),
		});
	}, {});
}
const signature = (body: string) => createHmac('sha256', publicKey).update(body).digest('base64');
it('requires both a private webhook secret and the exact body signature', async () => {
	const app = await setup();
	const body = JSON.stringify({ event: 'customer.updated', devMode: true });
	for (const headers of [
		{ 'x-webhook-signature': signature(body) },
		{ 'x-webhook-secret': secret },
		{ 'x-webhook-secret': secret, 'x-webhook-signature': signature(body + ' ') },
	]) {
		expect(
			(
				await app.inject({
					method: 'POST',
					url: '/api/payments/webhooks/abacatepay',
					headers: { 'content-type': 'application/json', ...headers },
					payload: body,
				})
			).statusCode,
		).toBe(401);
	}
	expect(
		(
			await app.inject({
				method: 'POST',
				url: '/api/payments/webhooks/abacatepay',
				headers: {
					'content-type': 'application/json',
					'x-webhook-secret': secret,
					'x-webhook-signature': signature(body),
				},
				payload: body,
			})
		).statusCode,
	).toBe(200);
	await app.close();
});
it('rejects a signed event from a different provider environment before any payment mutation', async () => {
	const app = await setup();
	const body = JSON.stringify({ event: 'customer.updated', devMode: false });
	const res = await app.inject({
		method: 'POST',
		url: '/api/payments/webhooks/abacatepay',
		headers: { 'content-type': 'application/json', 'x-webhook-secret': secret, 'x-webhook-signature': signature(body) },
		payload: body,
	});
	expect(res.statusCode).toBe(409);
	expect(res.json().title).toBe('PAYMENT_ENVIRONMENT_MISMATCH');
	await app.close();
});
