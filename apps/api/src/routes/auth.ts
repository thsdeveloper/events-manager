import {
	credentialsSchema,
	emailConfirmationSchema,
	registerSchema,
	resendEmailConfirmationSchema,
	updateProfileSchema,
} from '@events-manager/contracts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { AuthIdentity, AuthService } from '../application/auth/auth-service.js';
import type { ApiEnv } from '../config/env.js';
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
		await auth.requestPasswordReset(email, `${env.WEB_URL}/redefinir-senha`);
		return { success: true, message: 'Se o e-mail estiver cadastrado, as instruções serão enviadas.' };
	};
	app.post('/api/auth/password/request', requestPasswordReset);
	app.post('/api/auth/forgot-password', requestPasswordReset);

	app.post('/api/auth/password/reset', async (request) => {
		const input = z.object({ access_token: z.string(), password: z.string().min(8) }).parse(request.body);
		await limit('auth-password-reset', request.ip, 5, 600);
		await auth.resetPassword(input.access_token, input.password);
		return { success: true };
	});

	app.patch('/api/user/profile', async (request) => {
		const context = await requireUser(request, auth);
		const user = await auth.updateProfile(context.user, updateProfileSchema.parse(request.body));
		return { success: true, user };
	});

	app.patch('/api/user/password', async (request) => {
		const context = await requireUser(request, auth);
		const { password } = z.object({ password: z.string().min(8) }).parse(request.body);
		await auth.updatePassword(context.user.id, password);
		return { success: true };
	});
}
