import type { FastifyPluginAsync } from 'fastify';
import { describe, expect, it } from 'vitest';
import { adminRoutes } from '../src/routes/admin.js';
import { cmsRoutes } from '../src/routes/cms.js';
import { superAdminRoutes } from '../src/routes/super-admin.js';
import { financeRoutes } from '../src/routes/finance.js';
import { eventRoutes } from '../src/routes/events.js';
import { couponRoutes } from '../src/routes/coupons.js';
import { eventPageRoutes } from '../src/routes/event-pages.js';
import { ticketGroupRoutes } from '../src/routes/ticket-groups.js';
import { MockPaymentGateway } from '../src/infrastructure/payments/mock-payment-gateway.js';
import {
	buildRouteTestApp,
	createSupabaseClientsStub,
	createTestEnv,
	sessionCookie,
	TEST_USER_ID,
	TEST_EVENT_ID,
} from './support/index.js';

describe('authorization on every administrative HTTP route', () => {
	it.each([false, true])(
		'rejects every protected action for a caller with authenticated=%s and no administrative role',
		async (authenticated) => {
			const { clients } = createSupabaseClientsStub({
				user: authenticated ? { id: TEST_USER_ID, email: 'attendee@example.com' } : null,
				tables: {
					profiles: { data: { id: TEST_USER_ID, role: 'attendee', status: 'active' } },
					organizers: { data: [] },
				},
			});
			const routes: Array<{ method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; url: string }> = [];
			const app = await buildRouteTestApp(async (app) => {
				app.addHook('onRoute', (route) => {
					if (!/^\/api\/(admin|super-admin|organizer)\//.test(route.url)) return;
					for (const method of Array.isArray(route.method) ? route.method : [route.method]) {
						if (['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method))
							routes.push({
								method: method as (typeof routes)[number]['method'],
								url: route.url.replace(/:[^/]+/g, TEST_EVENT_ID),
							});
					}
				});
				for (const plugin of [
					adminRoutes,
					cmsRoutes,
					superAdminRoutes,
					financeRoutes,
					eventRoutes,
					couponRoutes,
					eventPageRoutes,
					ticketGroupRoutes,
				]) {
					const options = { clients, env: createTestEnv(), payments: new MockPaymentGateway() };
					await app.register(plugin as FastifyPluginAsync<typeof options>, options);
				}
			}, {});
			try {
				expect(routes.length).toBeGreaterThan(80);
				for (const route of routes) {
					const response = await app.inject({ ...route, headers: authenticated ? sessionCookie() : {} });
					expect(response.statusCode, `${route.method} ${route.url}: ${response.body}`).toBe(authenticated ? 403 : 401);
				}
			} finally {
				await app.close();
			}
		},
	);
});
