/**
 * Métodos de pagamento disponíveis no checkout hospedado.
 *
 * O front precisa saber o que a loja aceita antes de oferecer Pix ou cartão:
 * pedir um método desabilitado derruba o checkout inteiro no provedor.
 */
import { describe, expect, it } from 'vitest';
import { paymentRoutes } from '../src/routes/payments.js';
import { MockPaymentGateway } from '../src/infrastructure/payments/mock-payment-gateway.js';
import { buildRouteTestApp, createSupabaseClientsStub, createTestEnv } from './support/index.js';

describe('GET /api/payments/methods', () => {
	it('lists the methods the store is configured to accept, without requiring a session', async () => {
		const app = await buildRouteTestApp(paymentRoutes, {
			env: createTestEnv({ ABACATEPAY_METHODS: ['PIX', 'CARD'] }),
			clients: createSupabaseClientsStub().clients,
			payments: new MockPaymentGateway(),
		});

		const response = await app.inject({ method: 'GET', url: '/api/payments/methods' });

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({ methods: ['PIX', 'CARD'] });
	});

	it('offers Pix and card in mock mode, which simulates a fully enabled store', async () => {
		const app = await buildRouteTestApp(paymentRoutes, {
			env: createTestEnv({ PAYMENTS_MODE: 'mock', ABACATEPAY_METHODS: ['PIX'] }),
			clients: createSupabaseClientsStub().clients,
			payments: new MockPaymentGateway(),
		});

		const response = await app.inject({ method: 'GET', url: '/api/payments/methods' });

		expect(response.json()).toEqual({ methods: ['PIX', 'CARD'] });
	});
});

it.each([
	[{ accepted_payment_methods: ['PIX'], credit_card_settlement_period: null }, ['PIX']],
	[{ accepted_payment_methods: ['CARD'], credit_card_settlement_period: 'D+7' }, []],
	[{ accepted_payment_methods: ['BOLETO', 'CARD'], credit_card_settlement_period: 'D+1' }, ['BOLETO', 'CARD']],
])('offers only effective organization methods for a public event: %j', async (preferences, expected) => {
	const id = '10000000-0000-4000-8000-000000000001';
	const app = await buildRouteTestApp(paymentRoutes, {
		env: createTestEnv(),
		clients: createSupabaseClientsStub({
			tables: {
				events: { data: { id, organizer_id: preferences } },
				event_configurations: { data: { gateway_card_settlement_period: 'D+1' } },
			},
		}).clients,
		payments: new MockPaymentGateway(),
	});
	const response = await app.inject({ method: 'GET', url: `/api/payments/methods?eventId=${id}` });
	expect(response.statusCode).toBe(200);
	expect(response.json()).toEqual({ methods: expected });
	await app.close();
});
it('rejects an invalid event identifier before reading payment preferences', async () => {
	const app = await buildRouteTestApp(paymentRoutes, {
		env: createTestEnv(),
		clients: createSupabaseClientsStub().clients,
		payments: new MockPaymentGateway(),
	});
	const response = await app.inject({ method: 'GET', url: '/api/payments/methods?eventId=invalid' });
	expect(response.statusCode).toBe(422);
	await app.close();
});
