import { DEFAULT_GATEWAY_FEES } from '@events-manager/contracts';
import { describe, expect, it } from 'vitest';
import { superAdminRoutes } from '../src/routes/super-admin.js';
import { MockPaymentGateway } from '../src/infrastructure/payments/mock-payment-gateway.js';
import { buildRouteTestApp, createSupabaseClientsStub, sessionCookie, TEST_USER_ID } from './support/index.js';

const settings = {
	...DEFAULT_GATEWAY_FEES,
	platform_fee_percentage: 6,
	platform_fee_minimum: 2,
	minimum_payout: 3.5,
	payouts_enabled: false,
	convenience_fee_calculation_method: 'buyer_pays',
	gateway_card_settlement_period: 'D+7',
};
async function setup(role: string | null = 'super_admin') {
	const stub = createSupabaseClientsStub({
		user: role ? { id: TEST_USER_ID, email: 'admin@example.test' } : null,
		tables: {
			profiles: { data: { id: TEST_USER_ID, role, status: 'active' } },
			event_configurations: { data: settings },
			audit_logs: { data: {} },
		},
	});
	const app = await buildRouteTestApp(superAdminRoutes, { clients: stub.clients, payments: new MockPaymentGateway() });
	return { app, stub };
}
describe('super-admin fee schedule', () => {
	it('saves the exact 48 credit rates and operational fees', async () => {
		const { app } = await setup();
		const response = await app.inject({
			method: 'PATCH',
			url: '/api/super-admin/settings/payments',
			headers: sessionCookie(),
			payload: settings,
		});
		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({ settings });
		await app.close();
	});
	it('rejects an incomplete installment matrix', async () => {
		const { app } = await setup();
		const response = await app.inject({
			method: 'PATCH',
			url: '/api/super-admin/settings/payments',
			headers: sessionCookie(),
			payload: { ...settings, card_rates: { 'D+1': [1] } },
		});
		expect(response.statusCode).toBe(422);
		await app.close();
	});
	it.each([null, 'organizer'])('rejects fee changes from %s', async (role) => {
		const { app } = await setup(role);
		const response = await app.inject({
			method: 'PATCH',
			url: '/api/super-admin/settings/payments',
			headers: sessionCookie(),
			payload: settings,
		});
		expect(response.statusCode).toBe(role ? 403 : 401);
		await app.close();
	});
});
