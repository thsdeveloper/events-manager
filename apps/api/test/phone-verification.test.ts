import { describe, expect, it, vi } from 'vitest';
import { AuthProviderError, AuthService, type AuthRepository } from '../src/application/auth/auth-service.js';
import { SupabaseAuthRepository } from '../src/infrastructure/supabase/auth-repository.js';
import { authRoutes } from '../src/routes/auth.js';
import {
	buildRouteTestApp,
	createSupabaseClientsStub,
	createTestEnv,
	partialMock,
	sessionCookie,
	TEST_USER_ID,
} from './support/index.js';

const identity = { id: TEST_USER_ID, email: 'ana@example.com' };
const session = { accessToken: 'access-token', refreshToken: 'refresh-token' };
const PHONE = '11999990000';
const E164 = '+5511999990000';

describe('AuthService phone verification', () => {
	it('asks the provider to send a code to the Brazilian number in E.164 form', async () => {
		const repository = partialMock<AuthRepository>({ requestPhoneChange: vi.fn().mockResolvedValue(undefined) });

		await new AuthService(repository).requestPhoneVerification(identity, session, PHONE);

		expect(repository.requestPhoneChange).toHaveBeenCalledWith(session, E164);
	});

	it('surfaces the provider cooldown as a rate limit and other failures as a request error', async () => {
		const tooSoon = partialMock<AuthRepository>({
			requestPhoneChange: vi.fn().mockRejectedValue(new AuthProviderError('over_sms_send_rate_limit', 429)),
		});
		await expect(new AuthService(tooSoon).requestPhoneVerification(identity, session, PHONE)).rejects.toMatchObject({
			statusCode: 429,
			code: 'PHONE_CODE_RATE_LIMITED',
		});

		const down = partialMock<AuthRepository>({
			requestPhoneChange: vi.fn().mockRejectedValue(new AuthProviderError('provider down', 500)),
		});
		await expect(new AuthService(down).requestPhoneVerification(identity, session, PHONE)).rejects.toMatchObject({
			statusCode: 400,
			code: 'PHONE_CODE_REQUEST_ERROR',
		});
	});

	it('reports a phone that another account already confirmed as a conflict on the field', async () => {
		const repository = partialMock<AuthRepository>({
			requestPhoneChange: vi
				.fn()
				.mockRejectedValue(
					new AuthProviderError('A user with this phone number has already been registered', 422, 'phone_exists'),
				),
		});

		await expect(new AuthService(repository).requestPhoneVerification(identity, session, PHONE)).rejects.toMatchObject({
			statusCode: 409,
			code: 'PHONE_ALREADY_IN_USE',
			message: 'Este telefone já está confirmado em outra conta.',
			context: { field: 'phone' },
		});
	});

	it('says plainly when SMS is not configured in this environment', async () => {
		const repository = partialMock<AuthRepository>({
			requestPhoneChange: vi.fn().mockRejectedValue(new AuthProviderError('Unable to get SMS provider', 500)),
		});

		await expect(new AuthService(repository).requestPhoneVerification(identity, session, PHONE)).rejects.toMatchObject({
			statusCode: 503,
			code: 'SMS_PROVIDER_UNAVAILABLE',
			message: 'O envio de SMS não está configurado neste ambiente.',
		});
	});

	it('confirms the code with the provider and only then marks the phone as verified', async () => {
		const repository = partialMock<AuthRepository>({
			verifyPhoneChange: vi.fn().mockResolvedValue(undefined),
			markPhoneVerified: vi.fn().mockResolvedValue({ id: TEST_USER_ID, phone: PHONE, phone_verified_at: 'now' }),
		});

		await expect(
			new AuthService(repository).confirmPhoneVerification(identity, PHONE, '123456'),
		).resolves.toMatchObject({ phone: PHONE });

		expect(repository.verifyPhoneChange).toHaveBeenCalledWith(E164, '123456');
		expect(repository.markPhoneVerified).toHaveBeenCalledWith(TEST_USER_ID, PHONE);
	});

	it('rejects a wrong or expired code without touching the profile', async () => {
		const repository = partialMock<AuthRepository>({
			verifyPhoneChange: vi.fn().mockRejectedValue(new AuthProviderError('Token has expired or is invalid', 403)),
			markPhoneVerified: vi.fn(),
		});

		await expect(new AuthService(repository).confirmPhoneVerification(identity, PHONE, '000000')).rejects.toMatchObject(
			{
				statusCode: 400,
				code: 'INVALID_PHONE_CODE',
				context: { field: 'token' },
			},
		);
		expect(repository.markPhoneVerified).not.toHaveBeenCalled();
	});

	it('drops the verified mark when the phone is changed through the profile form', async () => {
		const repository = partialMock<AuthRepository>({
			updateProfile: vi.fn().mockResolvedValue({ id: TEST_USER_ID, phone: '11988887777' }),
		});

		await new AuthService(repository).updateProfile(identity, { phone: '11988887777' });

		expect(repository.updateProfile).toHaveBeenCalledWith(identity, { phone: '11988887777', phone_verified_at: null });
	});
});

describe('SupabaseAuthRepository phone verification', () => {
	it('sends the code through the person session: setSession then updateUser', async () => {
		const { clients, sessionAuth } = createSupabaseClientsStub({ user: identity });

		await new SupabaseAuthRepository(clients).requestPhoneChange(session, E164);

		expect(sessionAuth.setSession).toHaveBeenCalledWith({
			access_token: 'access-token',
			refresh_token: 'refresh-token',
		});
		expect(sessionAuth.updateUser).toHaveBeenCalledWith({ phone: E164 });
	});

	it('verifies the code as a phone_change OTP', async () => {
		const { clients, verifyOtp } = createSupabaseClientsStub({ user: identity });

		await new SupabaseAuthRepository(clients).verifyPhoneChange(E164, '123456');

		expect(verifyOtp).toHaveBeenCalledWith({ phone: E164, token: '123456', type: 'phone_change' });
	});

	it('turns a provider refusal into an AuthProviderError', async () => {
		const { clients, verifyOtp } = createSupabaseClientsStub({ user: identity });
		verifyOtp.mockResolvedValue({ data: { user: null, session: null }, error: { message: 'invalid', status: 403 } });

		await expect(new SupabaseAuthRepository(clients).verifyPhoneChange(E164, '000000')).rejects.toBeInstanceOf(
			AuthProviderError,
		);
	});

	it('exposes when the phone was verified', async () => {
		const { clients } = createSupabaseClientsStub({
			tables: {
				profiles: { data: { id: TEST_USER_ID, phone: PHONE, phone_verified_at: '2026-09-04T19:00:00.000Z' } },
				organizers: { data: [] },
				event_registrations: { data: [] },
			},
		});

		const user = await new SupabaseAuthRepository(clients).serialize(identity);

		expect(user.phone_verified_at).toBe('2026-09-04T19:00:00.000Z');
	});
});

describe('phone verification routes', () => {
	it('requires the session cookies to request a code', async () => {
		const { clients } = createSupabaseClientsStub();
		const app = await buildRouteTestApp(authRoutes, { env: createTestEnv(), clients });

		const response = await app.inject({ method: 'POST', url: '/api/user/phone/request', payload: { phone: PHONE } });
		await app.close();

		expect(response.statusCode).toBe(401);
	});

	it('sends the code for a signed-in person', async () => {
		const { clients, sessionAuth } = createSupabaseClientsStub({ user: identity });
		const app = await buildRouteTestApp(authRoutes, { env: createTestEnv(), clients });

		const response = await app.inject({
			method: 'POST',
			url: '/api/user/phone/request',
			headers: sessionCookie('access-token', 'refresh-token'),
			payload: { phone: '(11) 99999-0000' },
		});
		await app.close();

		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({ success: true });
		expect(sessionAuth.updateUser).toHaveBeenCalledWith({ phone: E164 });
	});

	it('answers a wrong code with a problem on the code field', async () => {
		const { clients, verifyOtp } = createSupabaseClientsStub({ user: identity });
		verifyOtp.mockResolvedValue({ data: { user: null, session: null }, error: { message: 'invalid', status: 403 } });
		const app = await buildRouteTestApp(authRoutes, { env: createTestEnv(), clients });

		const response = await app.inject({
			method: 'POST',
			url: '/api/user/phone/confirm',
			headers: sessionCookie(),
			payload: { phone: PHONE, token: '000000' },
		});
		await app.close();

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({ title: 'INVALID_PHONE_CODE', context: { field: 'token' } });
	});

	it('returns the updated user once the code is confirmed', async () => {
		const { clients } = createSupabaseClientsStub({
			user: identity,
			tables: {
				profiles: { data: { id: TEST_USER_ID, phone: PHONE, phone_verified_at: '2026-09-04T19:00:00.000Z' } },
			},
		});
		const app = await buildRouteTestApp(authRoutes, { env: createTestEnv(), clients });

		const response = await app.inject({
			method: 'POST',
			url: '/api/user/phone/confirm',
			headers: sessionCookie(),
			payload: { phone: PHONE, token: '123456' },
		});
		await app.close();

		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({ success: true, user: { phone: PHONE } });
	});
});

describe('development shortcut for phone confirmation', () => {
	const profile = { id: TEST_USER_ID, phone: PHONE, phone_verified_at: '2026-09-04T20:00:00.000Z' };

	it('confirms the phone at once in development, without asking the provider for a code', async () => {
		const { clients, sessionAuth } = createSupabaseClientsStub({
			user: identity,
			tables: { profiles: { data: profile } },
		});
		const app = await buildRouteTestApp(authRoutes, { env: createTestEnv({ NODE_ENV: 'development' }), clients });

		const response = await app.inject({
			method: 'POST',
			url: '/api/user/phone/request',
			headers: sessionCookie('access-token', 'refresh-token'),
			payload: { phone: PHONE },
		});
		await app.close();

		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({ success: true, verified: true, user: { phone: PHONE } });
		expect(sessionAuth.updateUser).not.toHaveBeenCalled();
	});

	it('never takes the shortcut outside development', async () => {
		const { clients, sessionAuth } = createSupabaseClientsStub({
			user: identity,
			tables: { profiles: { data: profile } },
		});
		const app = await buildRouteTestApp(authRoutes, { env: createTestEnv({ NODE_ENV: 'production' }), clients });

		const response = await app.inject({
			method: 'POST',
			url: '/api/user/phone/request',
			headers: sessionCookie('access-token', 'refresh-token'),
			payload: { phone: PHONE },
		});
		await app.close();

		expect(response.statusCode).toBe(200);
		expect(response.json()).not.toHaveProperty('verified');
		expect(sessionAuth.updateUser).toHaveBeenCalledWith({ phone: E164 });
	});
});
