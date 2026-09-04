import cookie from '@fastify/cookie';
import Fastify from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestEnv } from './support/index.js';
import type { SupabaseClients } from '../src/infrastructure/supabase/clients.js';
import { authRoutes } from '../src/routes/auth.js';
import { installErrorHandler } from '../src/shared/errors.js';

const env = createTestEnv();

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

	return {
		clients: clients as unknown as SupabaseClients,
		adminAuth: clients.admin.auth,
		forAccessToken,
		publicAuth,
		rateLimitRpc,
		recoveryAuth,
	};
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
				password: 'Qsesbs2006#@!',
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
			password: 'Qsesbs2006#@!',
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

	// auth.updateUser() depende da sessão interna do cliente, que no servidor está
	// vazia, então a troca passa a validar o token e aplicar a senha pelo admin.
	it('updates a password only after validating the recovery access token', async () => {
		const { clients, adminAuth } = createClients();
		adminAuth.getUser.mockResolvedValue({ data: { user: authUser }, error: null });
		adminAuth.admin.updateUserById.mockResolvedValue({ data: { user: authUser }, error: null });
		const app = await buildAuthTestApp(clients);

		const response = await app.inject({
			method: 'POST',
			url: '/api/auth/password/reset',
			payload: { access_token: 'recovery-access-token', password: 'Qsesbs2006#@!' },
		});
		await app.close();

		expect(response.statusCode).toBe(200);
		expect(adminAuth.getUser).toHaveBeenCalledWith('recovery-access-token');
		expect(adminAuth.admin.updateUserById).toHaveBeenCalledWith(authUser.id, { password: 'Qsesbs2006#@!' });
	});

	it('rejects a recovery token the provider does not recognise', async () => {
		const { clients, adminAuth } = createClients();
		adminAuth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid token', status: 401 } });
		const app = await buildAuthTestApp(clients);

		const response = await app.inject({
			method: 'POST',
			url: '/api/auth/password/reset',
			payload: { access_token: 'expirado', password: 'Qsesbs2006#@!' },
		});
		await app.close();

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({ title: 'PASSWORD_RESET_ERROR' });
		expect(adminAuth.admin.updateUserById).not.toHaveBeenCalled();
	});
});

describe('password change', () => {
	beforeEach(() => vi.clearAllMocks());

	/** Signs the request as `authUser`, the way the browser's session cookie does. */
	async function changePassword(
		clients: SupabaseClients,
		adminAuth: { getUser: ReturnType<typeof vi.fn> },
		payload: Record<string, unknown>,
	) {
		adminAuth.getUser.mockResolvedValue({ data: { user: authUser }, error: null });
		const app = await buildAuthTestApp(clients);
		const response = await app.inject({
			method: 'PATCH',
			url: '/api/user/password',
			cookies: { access_token: session.access_token },
			payload,
		});
		await app.close();

		return response;
	}

	it('refuses to change the password when the current one does not match', async () => {
		const { clients, adminAuth, publicAuth } = createClients();
		publicAuth.signInWithPassword.mockResolvedValue({
			data: { user: null, session: null },
			error: { code: 'invalid_credentials' },
		});

		const response = await changePassword(clients, adminAuth, {
			currentPassword: 'senha-errada',
			password: 'Qsesbs2006#@!',
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({
			title: 'INVALID_CURRENT_PASSWORD',
			detail: 'A senha atual está incorreta.',
		});
		// The whole point: a stolen session must not be enough to take the account.
		expect(adminAuth.admin.updateUserById).not.toHaveBeenCalled();
		expect(adminAuth.admin.signOut).not.toHaveBeenCalled();
	});

	it('requires the current password to be sent at all', async () => {
		const { clients, adminAuth, publicAuth } = createClients();

		const response = await changePassword(clients, adminAuth, { password: 'Qsesbs2006#@!' });

		expect(response.statusCode).toBe(422);
		expect(response.json()).toMatchObject({ title: 'VALIDATION_ERROR' });
		expect(publicAuth.signInWithPassword).not.toHaveBeenCalled();
		expect(adminAuth.admin.updateUserById).not.toHaveBeenCalled();
	});

	it('rejects a new password that does not satisfy the policy', async () => {
		const { clients, adminAuth, publicAuth } = createClients();

		// Long enough, but no special character.
		const response = await changePassword(clients, adminAuth, {
			currentPassword: 'senha-atual-1',
			password: 'senhanova123',
		});

		expect(response.statusCode).toBe(422);
		expect(response.json()).toMatchObject({ title: 'VALIDATION_ERROR' });
		expect(publicAuth.signInWithPassword).not.toHaveBeenCalled();
		expect(adminAuth.admin.updateUserById).not.toHaveBeenCalled();
	});

	it('rejects reusing the password that is already in place', async () => {
		const { clients, adminAuth, publicAuth } = createClients();

		const response = await changePassword(clients, adminAuth, {
			currentPassword: 'senha-atual-1',
			password: 'senha-atual-1',
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({ title: 'PASSWORD_UNCHANGED' });
		expect(publicAuth.signInWithPassword).not.toHaveBeenCalled();
	});

	it('changes the password and signs every other device out, keeping the current session', async () => {
		const { clients, adminAuth, publicAuth } = createClients();
		publicAuth.signInWithPassword.mockResolvedValue({
			data: { user: authUser, session: { ...session, access_token: 'probe-token' } },
			error: null,
		});
		adminAuth.admin.signOut.mockResolvedValue({ data: null, error: null });
		adminAuth.admin.updateUserById.mockResolvedValue({ data: { user: authUser }, error: null });

		const response = await changePassword(clients, adminAuth, {
			currentPassword: 'senha-atual-1',
			password: 'Qsesbs2006#@!',
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({ success: true, otherSessionsRevoked: true });
		expect(adminAuth.admin.updateUserById).toHaveBeenCalledWith(authUser.id, { password: 'Qsesbs2006#@!' });
		// `others` and not the default `global`: the browser doing the change stays
		// signed in while every other device is dropped.
		expect(adminAuth.admin.signOut).toHaveBeenCalledWith(session.access_token, 'others');
		// The reauthentication mints a throwaway session; it must not survive.
		expect(adminAuth.admin.signOut).toHaveBeenCalledWith('probe-token', 'local');
	});

	it('still reports success when the other sessions cannot be revoked', async () => {
		const { clients, adminAuth, publicAuth } = createClients();
		publicAuth.signInWithPassword.mockResolvedValue({ data: { user: authUser, session: null }, error: null });
		adminAuth.admin.updateUserById.mockResolvedValue({ data: { user: authUser }, error: null });
		adminAuth.admin.signOut.mockResolvedValue({ data: null, error: { message: 'provider down' } });

		const response = await changePassword(clients, adminAuth, {
			currentPassword: 'senha-atual-1',
			password: 'Qsesbs2006#@!',
		});

		// The password did change; reporting a failure would leave the user typing
		// the old one forever.
		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({ success: true, otherSessionsRevoked: false });
	});
});

describe('password policy scope', () => {
	beforeEach(() => vi.clearAllMocks());

	it('does not apply the policy to login, so older passwords still get in', async () => {
		const { clients, publicAuth } = createClients();
		publicAuth.signInWithPassword.mockResolvedValue({ data: { user: authUser, session }, error: null });
		const app = await buildAuthTestApp(clients);

		// No digit and no special character: it would never be accepted as a *new*
		// password. Enforcing the policy here would lock out every account created
		// before it — including from the screen used to fix the password.
		const response = await app.inject({
			method: 'POST',
			url: '/api/auth/login',
			payload: { email: authUser.email, password: 'senhaantiga' },
		});
		await app.close();

		expect(response.statusCode).toBe(200);
		expect(publicAuth.signInWithPassword).toHaveBeenCalledWith({
			email: authUser.email,
			password: 'senhaantiga',
		});
	});

	it('applies the policy when a password is created at registration', async () => {
		const { clients, publicAuth } = createClients();
		const app = await buildAuthTestApp(clients);

		const response = await app.inject({
			method: 'POST',
			url: '/api/auth/register',
			payload: { email: authUser.email, password: 'senhaantiga', firstName: 'Ana', lastName: 'Silva' },
		});
		await app.close();

		expect(response.statusCode).toBe(422);
		expect(response.json()).toMatchObject({ title: 'VALIDATION_ERROR' });
		expect(publicAuth.signUp).not.toHaveBeenCalled();
	});

	it('applies the policy when a password is created through the recovery flow', async () => {
		const { clients, adminAuth } = createClients();
		const app = await buildAuthTestApp(clients);

		const response = await app.inject({
			method: 'POST',
			url: '/api/auth/password/reset',
			payload: { access_token: 'recovery-access-token', password: 'senhaantiga' },
		});
		await app.close();

		expect(response.statusCode).toBe(422);
		expect(response.json()).toMatchObject({ title: 'VALIDATION_ERROR' });
		expect(adminAuth.admin.updateUserById).not.toHaveBeenCalled();
	});
});
