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
