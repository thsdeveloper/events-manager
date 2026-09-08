import { describe, expect, it } from 'vitest';
import { contentRoutes } from '../src/routes/content.js';
import { buildRouteTestApp, createSupabaseClientsStub, createTestEnv } from './support/index.js';

const configuration = {
	id: 1,
	platform_fee_percentage: 5,
	pix_fee_fixed: 0.8,
	card_fee_percentage: 3.5,
	card_fee_fixed: 0.6,
	card_installment_2_6_percentage: 4,
	card_installment_7_12_percentage: 4.5,
	boleto_fee_fixed: 2.5,
	payout_fee_fixed: 0.8,
	minimum_payout: 3.5,
	payouts_enabled: true,
	convenience_fee_calculation_method: 'buyer_pays',
	payment_gateway: 'abacatepay',
	ticket_code_prefix: 'EVT',
};

describe('GET /api/content/fees', () => {
	it('publishes the fee table to visitors without exposing gateway or operational settings', async () => {
		const stub = createSupabaseClientsStub({ tables: { event_configurations: { data: configuration } } });
		const app = await buildRouteTestApp(contentRoutes, { clients: stub.clients, env: createTestEnv() });

		const response = await app.inject({ method: 'GET', url: '/api/content/fees' });

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			platform_fee_percentage: 5,
			pix_fee_fixed: 0.8,
			card_fee_percentage: 3.5,
			card_fee_fixed: 0.6,
			card_installment_2_6_percentage: 4,
			card_installment_7_12_percentage: 4.5,
			boleto_fee_fixed: 2.5,
			payout_fee_fixed: 0.8,
			minimum_payout: 3.5,
			convenience_fee_calculation_method: 'buyer_pays',
		});
	});
});
