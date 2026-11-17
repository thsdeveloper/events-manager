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

const categoryId = '50000000-0000-0000-0000-000000000001';
async function setup(role: string | null = 'super_admin') {
	const { clients } = createSupabaseClientsStub({
		user: role ? { id: TEST_USER_ID, email: 'admin@example.test' } : null,
		tables: {
			profiles: { data: { id: TEST_USER_ID, role, status: 'active' } },
			event_categories: { data: { id: categoryId, name: 'Tecnologia', description: 'Oficinas e encontros' } },
		},
	});
	return buildRouteTestApp(superAdminRoutes, { clients, payments: partialMock<PaymentGateway>({}) });
}

describe.each(['PATCH', 'DELETE'] as const)('%s existing catalog category', (method) => {
	it('accepts the original database identifier', async () => {
		const app = await setup();
		const response = await app.inject({
			method,
			url: `/api/super-admin/categories/${categoryId}`,
			headers: sessionCookie(),
			...(method === 'PATCH' ? { payload: { description: 'Oficinas e encontros' } } : {}),
		});
		await app.close();
		expect(response.statusCode).toBe(200);
	});

	it('rejects malformed identifiers', async () => {
		const app = await setup();
		const response = await app.inject({
			method,
			url: '/api/super-admin/categories/tecnologia',
			headers: sessionCookie(),
		});
		await app.close();
		expect(response.statusCode).toBe(422);
	});

	it.each([
		[null, 401],
		['organizer', 403],
	] as const)('retains access restrictions for %s', async (role, status) => {
		const app = await setup(role);
		const response = await app.inject({
			method,
			url: `/api/super-admin/categories/${categoryId}`,
			headers: sessionCookie(),
		});
		await app.close();
		expect(response.statusCode).toBe(status);
	});
});
