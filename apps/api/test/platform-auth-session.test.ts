import { it, expect } from 'vitest';
import { authRoutes } from '../src/routes/auth.js';
import {
	buildRouteTestApp,
	createSupabaseClientsStub,
	sessionCookie,
	TEST_ENV,
	TEST_USER_ID,
} from './support/index.js';
it.each([true, false])(
	'reflects current platform access in the session without promoting the profile (active=%s)',
	async (active) => {
		const stub = createSupabaseClientsStub({
			user: { id: TEST_USER_ID, email: 'support@example.test' },
			tables: {
				profiles: { data: { id: TEST_USER_ID, role: 'attendee', status: 'active' } },
				organizers: { data: [] },
				organization_members: { data: [] },
			},
			rpc: { data: { userId: TEST_USER_ID, active, isRoot: false, permissions: ['platform_organizers.read'] } },
		});
		const app = await buildRouteTestApp(authRoutes, { clients: stub.clients, env: TEST_ENV });
		const result = await app.inject({ url: '/api/auth/me', headers: sessionCookie() });
		expect(result.statusCode).toBe(200);
		expect(result.json()).toMatchObject({
			isSuperAdmin: active,
			user: { role: 'attendee', can_access_platform: active },
		});
		await app.close();
	},
);
