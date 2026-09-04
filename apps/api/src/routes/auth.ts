import {
	credentialsSchema,
	emailConfirmationSchema,
	newPasswordSchema,
	registerSchema,
	resendEmailConfirmationSchema,
	updateProfileSchema,
} from '@events-manager/contracts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { AuthIdentity, AuthService } from '../application/auth/auth-service.js';
import type { ApiEnv } from '../config/env.js';
import { createEmailService } from '../infrastructure/email/create-email-service.js';
import { createSupabaseAuthService } from '../infrastructure/supabase/auth-repository.js';
import type { SupabaseClients } from '../infrastructure/supabase/clients.js';
import { EnforceRateLimit, RateLimitExceeded } from '../application/security/rate-limit.js';
import { SupabaseRateLimitRepository } from '../infrastructure/supabase/rate-limit-repository.js';
import { ApiError } from '../shared/errors.js';
import { readAccessToken, requireUser } from './auth-context.js';
import { clearSessionCookies, setSessionCookies } from './session-cookies.js';

const compatibleRegisterSchema = registerSchema
	.partial({ first_name: true, last_name: true })
	.extend({
		firstName: z.string().trim().min(1).optional(),
		lastName: z.string().trim().min(1).optional(),
	})
	.superRefine((value, context) => {
		if (!value.first_name && !value.firstName)
			context.addIssue({ code: 'custom', path: ['first_name'], message: 'Nome obrigatório' });
		if (!value.last_name && !value.lastName)
			context.addIssue({ code: 'custom', path: ['last_name'], message: 'Sobrenome obrigatório' });
	});

/**
 * `currentPassword` has no length rule on purpose: it is checked against the
 * stored one, and a minimum here would reject accounts created before the
 * current policy instead of letting them change to a compliant password.
 */
const changePasswordSchema = z.object({
	currentPassword: z.string().min(1),
	password: newPasswordSchema,
});

async function sessionPayload(auth: AuthService, user: AuthIdentity) {
	const serialized = await auth.serialize(user);
	const isSuperAdmin = serialized.role === 'super_admin';
	const isOrganizer =
		serialized.role === 'organizer' || serialized.role === 'admin' || serialized.organizer?.status === 'active';
	return {
		success: true,
		user: serialized,
		isOrganizer,
		isSuperAdmin,
		redirect: isSuperAdmin ? '/super-admin' : isOrganizer ? '/admin' : '/perfil',
	};
}

export async function authRoutes(app: FastifyInstance, options: { env: ApiEnv; clients: SupabaseClients }) {
	const { env, clients } = options;
	const auth = createSupabaseAuthService(clients);
	const { email } = createEmailService(env, clients);
	const rateLimit = new EnforceRateLimit(new SupabaseRateLimitRepository(clients.admin));
	const limit = async (scope: string, subject: string, attempts: number, windowSeconds: number) => {
		try {
			await rateLimit.execute({ scope, subject, limit: attempts, windowSeconds });
		} catch (error) {
			if (error instanceof RateLimitExceeded) {
				throw new ApiError('Muitas tentativas. Aguarde e tente novamente.', 429, 'RATE_LIMITED');
			}
			throw error;
		}
	};

	app.post('/api/auth/register', async (request, reply) => {
		const input = compatibleRegisterSchema.parse(request.body);
		await Promise.all([
			limit('auth-register-ip', request.ip, 20, 3_600),
			limit('auth-register-account', input.email.toLowerCase(), 5, 600),
		]);
		const result = await auth.register({
			email: input.email,
			password: input.password,
			firstName: input.first_name ?? input.firstName!,
			lastName: input.last_name ?? input.lastName!,
			redirectTo: `${env.WEB_URL}/confirmar-email`,
		});
		if (result.session) {
			setSessionCookies(reply, env, result.session);
			return reply.code(201).send({
				success: true,
				confirmationRequired: false,
				user: await auth.serialize(result.user),
				redirect: '/perfil',
			});
		}
		return reply.code(201).send({
			success: true,
			confirmationRequired: true,
			email: input.email,
			message: 'Enviamos um código de confirmação para o seu e-mail.',
		});
	});

	app.post('/api/auth/register/confirm', async (request, reply) => {
		const input = emailConfirmationSchema.parse(request.body);
		await Promise.all([
			limit('auth-confirm-ip', request.ip, 30, 600),
			limit('auth-confirm-account', input.email.toLowerCase(), 10, 600),
		]);
		const result = await auth.confirmEmail(input.email, input.token);
		setSessionCookies(reply, env, result.session);
		return sessionPayload(auth, result.user);
	});

	app.post('/api/auth/register/resend', async (request) => {
		const input = resendEmailConfirmationSchema.parse(request.body);
		await Promise.all([
			limit('auth-resend-ip', request.ip, 10, 600),
			limit('auth-resend-account', input.email.toLowerCase(), 3, 600),
		]);
		await auth.resendEmailConfirmation(input.email, `${env.WEB_URL}/confirmar-email`);
		return { success: true, message: 'Enviamos um novo código de confirmação para o seu e-mail.' };
	});

	app.post('/api/auth/login', async (request, reply) => {
		const input = credentialsSchema.parse(request.body);
		await Promise.all([
			limit('auth-login-ip', request.ip, 50, 300),
			limit('auth-login-account', input.email.toLowerCase(), 10, 300),
		]);
		const result = await auth.login(input.email, input.password);
		setSessionCookies(reply, env, result.session);
		return sessionPayload(auth, result.user);
	});

	app.get('/api/auth/me', async (request) => {
		const context = await requireUser(request, auth);
		const user = await auth.serialize(context.user);
		const organizerStatus = user.organizer?.status ?? null;
		return {
			user,
			isOrganizer: user.role === 'admin' || user.role === 'organizer' || organizerStatus === 'active',
			isSuperAdmin: user.role === 'super_admin',
			organizerProfile: user.organizer,
			organizerStatus,
			hasPendingOrganizerRequest: organizerStatus === 'pending',
		};
	});

	app.post('/api/auth/refresh', async (request, reply) => {
		await limit('auth-refresh', request.ip, 30, 60);
		const body = z.object({ refresh_token: z.string().optional() }).parse(request.body ?? {});
		const refreshToken = body.refresh_token ?? request.cookies.refresh_token;
		if (!refreshToken) throw new ApiError('Token de atualização ausente.', 401, 'MISSING_REFRESH_TOKEN');
		const result = await auth.refresh(refreshToken);
		setSessionCookies(reply, env, result.session);
		return { success: true, user: await auth.serialize(result.user) };
	});

	app.post('/api/auth/logout', async (request, reply) => {
		const accessToken = readAccessToken(request);
		if (accessToken) await auth.signOut(accessToken).catch(() => undefined);
		clearSessionCookies(reply, env);
		return reply.code(204).send();
	});

	const requestPasswordReset = async (request: FastifyRequest) => {
		const { email } = z.object({ email: z.string().email() }).parse(request.body);
		await Promise.all([
			limit('auth-password-request-ip', request.ip, 10, 600),
			limit('auth-password-request-account', email.toLowerCase(), 3, 600),
		]);
		// A resposta é sempre a mesma para não revelar quais e-mails estão cadastrados,
		// então a causa real da falha só existe no log: sem ela, provedor fora do ar e
		// rate limit ficam indistinguíveis de um envio bem-sucedido.
		await auth.requestPasswordReset(email, `${env.WEB_URL}/redefinir-senha`).catch((error: unknown) => {
			request.log.warn({ err: error, email }, 'Falha ao enviar o e-mail de redefinição de senha.');
		});
		return { success: true, message: 'Se o e-mail estiver cadastrado, as instruções serão enviadas.' };
	};
	app.post('/api/auth/password/request', requestPasswordReset);
	app.post('/api/auth/forgot-password', requestPasswordReset);

	app.post('/api/auth/password/reset', async (request) => {
		const input = z.object({ access_token: z.string(), password: newPasswordSchema }).parse(request.body);
		await limit('auth-password-reset', request.ip, 5, 600);
		await auth.resetPassword(input.access_token, input.password);
		return { success: true };
	});

	app.patch('/api/user/profile', async (request) => {
		const context = await requireUser(request, auth);
		const user = await auth.updateProfile(context.user, updateProfileSchema.parse(request.body));
		return { success: true, user };
	});

	/**
	 * Changing a password is what turns temporary access to a session into
	 * permanent ownership of an account, so it is guarded on four fronts: the
	 * current password is required, attempts are rate limited, every other device
	 * is signed out, and the account owner is warned by e-mail.
	 */
	app.patch('/api/user/password', async (request) => {
		const context = await requireUser(request, auth);
		const { currentPassword, password } = changePasswordSchema.parse(request.body);
		// Both budgets are spent before the current password is checked, so the
		// endpoint cannot be used to brute-force it from a stolen session.
		await Promise.all([
			limit('user-password-change', context.user.id, 5, 900),
			limit('user-password-change-ip', request.ip, 20, 900),
		]);

		await auth.changePassword(context.user, currentPassword, password);

		// From here the password has already changed. Neither follow-up may turn a
		// successful change into an error response, so both are logged instead —
		// telling the user it failed would leave them using the old password.
		const otherSessionsRevoked = await auth
			.revokeOtherSessions(context.accessToken)
			.then(() => true)
			.catch((error: unknown) => {
				request.log.error(
					{ err: error, userId: context.user.id },
					'Falha ao encerrar as outras sessões após a troca de senha.',
				);
				return false;
			});

		if (context.user.email) {
			await email
				.sendPasswordChangedNotice(
					{ changedAt: new Date(), email: context.user.email },
					`password-changed-${context.user.id}-${Date.now()}`,
				)
				.catch((error: unknown) => {
					request.log.error(
						{ err: error, userId: context.user.id },
						'Falha ao enviar o aviso de senha alterada.',
					);
				});
		}

		return { success: true, otherSessionsRevoked };
	});
}
