import { describe, expect, it, vi } from 'vitest';
import { AuthService, type AuthRepository } from '../src/application/auth/auth-service.js';
import { organizerRoutes } from '../src/routes/organizers.js';
import {
	buildRouteTestApp,
	createSupabaseClientsStub,
	createTestEnv,
	partialMock,
	sessionCookie,
	TEST_USER_ID,
} from './support/index.js';

const identity = { id: TEST_USER_ID, email: 'ana@example.com' };

const completeProfile = {
	id: TEST_USER_ID,
	email: 'ana@example.com',
	first_name: 'Ana',
	last_name: 'Silva',
	avatar: 'media-1',
	birth_date: '1990-05-20',
	document: '52998224725',
	phone: '11999990000',
	phone_verified_at: '2026-09-04T19:00:00.000Z',
	location: 'Uberlândia - MG',
	description: 'Gosto de festivais.',
	role: 'attendee',
	status: 'active',
};

describe('AuthService.requireCompleteProfile', () => {
	it('lets a complete profile through', async () => {
		const repository = partialMock<AuthRepository>({
			serialize: vi.fn().mockResolvedValue({ ...completeProfile, organizer: null }),
		});

		await expect(new AuthService(repository).requireCompleteProfile(identity)).resolves.toMatchObject({ document: '52998224725' });
	});

	it('refuses an incomplete profile and says exactly what is missing', async () => {
		const repository = partialMock<AuthRepository>({
			serialize: vi
				.fn()
				.mockResolvedValue({ ...completeProfile, document: null, phone_verified_at: null, organizer: null }),
		});

		await expect(new AuthService(repository).requireCompleteProfile(identity)).rejects.toMatchObject({
			statusCode: 403,
			code: 'PROFILE_INCOMPLETE',
			context: { missing: ['CPF', 'Telefone confirmado'] },
		});
	});
});

describe('becoming an organizer requires a complete profile', () => {
	function appWithProfile(profile: Record<string, unknown>) {
		const { clients } = createSupabaseClientsStub({
			user: identity,
			tables: { profiles: { data: profile }, organizers: { data: [] }, event_registrations: { data: [] } },
		});

		return buildRouteTestApp(organizerRoutes, { env: createTestEnv(), clients });
	}

	const request = {
		account_type: 'individual',
		name: 'Maya Eventos',
		email: 'contato@maya.com',
		phone: '11999990000',
		accept_terms: true,
	};

	it.each(['/api/organizer/request', '/api/organizer/organizations'])(
		'%s answers 403 with the missing items while the profile is incomplete',
		async (url) => {
			const app = await appWithProfile({ ...completeProfile, phone: null, phone_verified_at: null });

			const response = await app.inject({ method: 'POST', url, headers: sessionCookie(), payload: request });
			await app.close();

			expect(response.statusCode).toBe(403);
			expect(response.json()).toMatchObject({
				title: 'PROFILE_INCOMPLETE',
				context: { missing: ['Telefone', 'Telefone confirmado'] },
			});
		},
	);

	it('reaches the organizer service once the profile is complete', async () => {
		const app = await appWithProfile(completeProfile);

		const response = await app.inject({
			method: 'POST',
			url: '/api/organizer/request',
			headers: sessionCookie(),
			payload: request,
		});
		await app.close();

		expect(response.statusCode).not.toBe(403);
	});
});
