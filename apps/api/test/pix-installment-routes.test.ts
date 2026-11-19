import { expect, it } from 'vitest';
import { paymentRoutes } from '../src/routes/payments.js';
import { MockPaymentGateway } from '../src/infrastructure/payments/mock-payment-gateway.js';
import {
	buildRouteTestApp,
	createSupabaseClientsStub,
	createTestEnv,
	sessionCookie,
	TEST_USER_ID,
} from './support/index.js';
const id = '00000000-0000-4000-8000-000000000012';
async function setup(authenticated = true, development = true) {
	return buildRouteTestApp(paymentRoutes, {
		env: createTestEnv({ PAYMENTS_MODE: 'mock', APP_ENV: development ? 'development' : 'production' }),
		payments: new MockPaymentGateway(),
		clients: createSupabaseClientsStub({
			user: authenticated ? { id: TEST_USER_ID, email: 'buyer@example.test' } : null,
			tables: {
				profiles: { data: { id: TEST_USER_ID, role: 'user', status: 'active' } },
				payment_installments: {
					data: {
						id,
						status: 'pending',
						provider_transaction_id: 'mock_pix',
						registration_id: { id: TEST_USER_ID, user_id: TEST_USER_ID, status: 'partial_payment' },
					},
				},
				event_registrations: { data: [] },
			},
			rpc: { data: true },
		}).clients,
	});
}
it.each([
	{ authenticated: false, development: true, status: 401 },
	{ authenticated: true, development: false, status: 403 },
	{ authenticated: true, development: true, status: 200 },
])('guards installment simulation: %j', async ({ authenticated, development, status }) => {
	const app = await setup(authenticated, development);
	const response = await app.inject({
		method: 'POST',
		url: `/api/installments/${id}/simulate-payment`,
		headers: authenticated ? sessionCookie() : {},
	});
	expect(response.statusCode).toBe(status);
	await app.close();
});
it('validates installment ids', async () => {
	const app = await setup();
	expect(
		(await app.inject({ method: 'POST', url: '/api/installments/invalid/simulate-payment', headers: sessionCookie() }))
			.statusCode,
	).toBe(422);
	await app.close();
});
