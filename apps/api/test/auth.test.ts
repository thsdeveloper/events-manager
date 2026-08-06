import cookie from '@fastify/cookie';
import Fastify from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../src/config/env.js';
import type { SupabaseClients } from '../src/infrastructure/supabase/clients.js';
import { authRoutes } from '../src/routes/auth.js';
import { installErrorHandler } from '../src/shared/errors.js';

const env: ApiEnv = {
	NODE_ENV: 'test',
	API_HOST: '127.0.0.1',
	API_PORT: 3333,
	TRUST_PROXY_HOPS: 0,
	WEB_URL: 'http://localhost:3003',
	SUPABASE_URL: 'http://127.0.0.1:55321',
	SUPABASE_ANON_KEY: 'test-anon-key',
	SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
	COOKIE_SECRET: 'test-cookie-secret-value',
	ABACATEPAY_BASE_URL: 'https://api.abacatepay.com/v2',
	PAYMENTS_MODE: 'mock',
	PAYMENT_RECONCILIATION_INTERVAL_SECONDS: 60,
	PAYMENT_RECONCILIATION_MIN_AGE_MINUTES: 20,
	PAYMENT_RECONCILIATION_BATCH_SIZE: 25,
	SMTP_HOST: '127.0.0.1',
	SMTP_PORT: 55325,
	SMTP_SECURE: false,
	EMAIL_FROM: 'Events Manager <test@events.local>',
};

const authUser = {
	id: '00000000-0000-4000-8000-000000000001',
	email: 'ana@example.com',
	user_metadata: { first_name: 'Ana', last_name: 'Silva' },
};

const session = {
	access_token: 'access-token',
	refresh_token: 'refresh-token',
	expires_in: 3600,
};

function createClients() {
	const publicAuth = {
		signUp: vi.fn(),
		verifyOtp: vi.fn(),
		resend: vi.fn(),
		signInWithPassword: vi.fn(),
		refreshSession: vi.fn(),
		resetPasswordForEmail: vi.fn(),
		updateUser: vi.fn(),
	};
	const recoveryAuth = { updateUser: vi.fn() };
	const forAccessToken = vi.fn(() => ({ auth: recoveryAuth }));
	const rateLimitRpc = vi.fn().mockResolvedValue({ data: true, error: null });

	const clients = {
		public: { auth: publicAuth },
		admin: {
			rpc: rateLimitRpc,
			auth: {
				getUser: vi.fn(),
				admin: {
					signOut: vi.fn(),
					updateUserById: vi.fn(),
				},
			},
			from: vi.fn((table: string) => ({
				select: vi.fn(() => ({
					eq: vi.fn(() => ({
						maybeSingle: vi.fn(async () => ({
							data:
								table === 'profiles'
									? {
											id: authUser.id,
											email: authUser.email,
											first_name: 'Ana',
											last_name: 'Silva',
											role: 'attendee',
											status: 'active',
										}
									: null,
							error: null,
						})),
					})),
				})),
			})),
		},
		forAccessToken,
	};

	return { clients: clients as unknown as SupabaseClients, forAccessToken, publicAuth, rateLimitRpc, recoveryAuth };
}

async function buildAuthTestApp(clients: SupabaseClients) {
	const app = Fastify();
	await app.register(cookie, { secret: env.COOKIE_SECRET });
	installErrorHandler(app);
	await app.register(authRoutes, { env, clients });
	return app;
}

describe('email confirmation during registration', () => {
	beforeEach(() => vi.clearAllMocks());

	it('creates a pending account and requests email confirmation', async () => {
		const { clients, publicAuth } = createClients();
		publicAuth.signUp.mockResolvedValue({ data: { user: authUser, session: null }, error: null });
		const app = await buildAuthTestApp(clients);

		const response = await app.inject({
			method: 'POST',
			url: '/api/auth/register',
			payload: {
				email: authUser.email,
				password: 'senha-segura',
				firstName: 'Ana',
				lastName: 'Silva',
			},
		});
		await app.close();

		expect(response.statusCode).toBe(201);
		expect(response.json()).toMatchObject({
			success: true,
			confirmationRequired: true,
			email: authUser.email,
		});
		expect(response.headers['set-cookie']).toBeUndefined();
		expect(publicAuth.signUp).toHaveBeenCalledWith({
			email: authUser.email,
			password: 'senha-segura',
			options: {
				data: { first_name: 'Ana', last_name: 'Silva' },
				emailRedirectTo: 'http://localhost:3003/confirmar-email',
			},
		});
	});

	it('rejects a malformed confirmation code before calling Supabase', async () => {
		const { clients, publicAuth } = createClients();
		const app = await buildAuthTestApp(clients);

		const response = await app.inject({
			method: 'POST',
			url: '/api/auth/register/confirm',
			payload: { email: authUser.email, token: '12ab' },
		});
		await app.close();

		expect(response.statusCode).toBe(422);
		expect(response.json()).toMatchObject({ title: 'VALIDATION_ERROR' });
		expect(publicAuth.verifyOtp).not.toHaveBeenCalled();
	});

	it('confirms the OTP without a previous session and creates secure session cookies', async () => {
		const { clients, publicAuth } = createClients();
		publicAuth.verifyOtp.mockResolvedValue({ data: { user: authUser, session }, error: null });
		const app = await buildAuthTestApp(clients);

		const response = await app.inject({
			method: 'POST',
			url: '/api/auth/register/confirm',
			payload: { email: authUser.email, token: '123456' },
		});
		await app.close();

		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({ success: true, redirect: '/perfil' });
		expect(response.headers['set-cookie']).toEqual(
			expect.arrayContaining([
				expect.stringContaining('access_token=access-token'),
				expect.stringContaining('refresh_token=refresh-token'),
			]),
		);
		expect(publicAuth.verifyOtp).toHaveBeenCalledWith({
			email: authUser.email,
			token: '123456',
			type: 'email',
		});
	});

	it('maps expired or invalid OTPs to a stable Problem Details response', async () => {
		const { clients, publicAuth } = createClients();
		publicAuth.verifyOtp.mockResolvedValue({ data: { user: null, session: null }, error: { code: 'otp_expired' } });
		const app = await buildAuthTestApp(clients);

		const response = await app.inject({
			method: 'POST',
			url: '/api/auth/register/confirm',
			payload: { email: authUser.email, token: '123456' },
		});
		await app.close();

		expect(response.statusCode).toBe(400);
		expect(response.headers['content-type']).toContain('application/problem+json');
		expect(response.json()).toMatchObject({
			title: 'INVALID_EMAIL_CONFIRMATION_CODE',
			detail: 'Código inválido ou expirado.',
		});
	});

	it('blocks password login until the email is confirmed', async () => {
		const { clients, publicAuth } = createClients();
		publicAuth.signInWithPassword.mockResolvedValue({
			data: { user: null, session: null },
			error: { code: 'email_not_confirmed' },
		});
		const app = await buildAuthTestApp(clients);

		const response = await app.inject({
			method: 'POST',
			url: '/api/auth/login',
			payload: { email: authUser.email, password: 'senha-segura' },
		});
		await app.close();

		expect(response.statusCode).toBe(403);
		expect(response.json()).toMatchObject({
			title: 'EMAIL_NOT_CONFIRMED',
			detail: 'Confirme seu e-mail antes de entrar.',
		});
	});

	it('blocks authentication attempts when the shared rate limit is exhausted', async () => {
		const { clients, publicAuth, rateLimitRpc } = createClients();
		rateLimitRpc.mockResolvedValue({ data: false, error: null });
		const app = await buildAuthTestApp(clients);

		const response = await app.inject({
			method: 'POST',
			url: '/api/auth/login',
			payload: { email: authUser.email, password: 'senha-segura' },
		});
		await app.close();

		expect(response.statusCode).toBe(429);
		expect(response.json()).toMatchObject({ title: 'RATE_LIMITED' });
		expect(publicAuth.signInWithPassword).not.toHaveBeenCalled();
	});

	it('resends the signup confirmation code and preserves the rate limit', async () => {
		const { clients, publicAuth } = createClients();
		publicAuth.resend.mockResolvedValueOnce({ data: {}, error: null }).mockResolvedValueOnce({
			data: null,
			error: { status: 429, code: 'over_email_send_rate_limit' },
		});
		const app = await buildAuthTestApp(clients);

		const successResponse = await app.inject({
			method: 'POST',
			url: '/api/auth/register/resend',
			payload: { email: authUser.email },
		});
		const limitedResponse = await app.inject({
			method: 'POST',
			url: '/api/auth/register/resend',
			payload: { email: authUser.email },
		});
		await app.close();

		expect(successResponse.statusCode).toBe(200);
		expect(successResponse.json()).toMatchObject({ success: true });
		expect(limitedResponse.statusCode).toBe(429);
		expect(limitedResponse.json()).toMatchObject({ title: 'EMAIL_CONFIRMATION_RATE_LIMIT' });
	});

	it('requests recovery without revealing whether an account exists', async () => {
		const { clients, publicAuth } = createClients();
		publicAuth.resetPasswordForEmail.mockResolvedValue({ data: null, error: { message: 'user not found' } });
		const app = await buildAuthTestApp(clients);

		const response = await app.inject({
			method: 'POST',
			url: '/api/auth/forgot-password',
			payload: { email: 'unknown@example.com' },
		});
		await app.close();

		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({
			success: true,
			message: 'Se o e-mail estiver cadastrado, as instruções serão enviadas.',
		});
		expect(publicAuth.resetPasswordForEmail).toHaveBeenCalledWith('unknown@example.com', {
			redirectTo: 'http://localhost:3003/redefinir-senha',
		});
	});

	it('updates a password only through the recovery-scoped access token', async () => {
		const { clients, forAccessToken, recoveryAuth } = createClients();
		recoveryAuth.updateUser.mockResolvedValue({ data: { user: authUser }, error: null });
		const app = await buildAuthTestApp(clients);

		const response = await app.inject({
			method: 'POST',
			url: '/api/auth/password/reset',
			payload: { access_token: 'recovery-access-token', password: 'nova-senha-segura' },
		});
		await app.close();

		expect(response.statusCode).toBe(200);
		expect(forAccessToken).toHaveBeenCalledWith('recovery-access-token');
		expect(recoveryAuth.updateUser).toHaveBeenCalledWith({ password: 'nova-senha-segura' });
	});
});
