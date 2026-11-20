import {
	credentialsSchema,
	emailConfirmationSchema,
	newPasswordSchema,
	registerSchema,
	resendEmailConfirmationSchema,
	updateProfileSchema,
	phoneVerificationConfirmSchema,
	phoneVerificationRequestSchema,
} from '@events-manager/contracts';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { DocumentAlreadyInUse, type AuthIdentity, type AuthService } from '../application/auth/auth-service.js';
import type { ApiEnv } from '../config/env.js';
import { createEmailService } from '../infrastructure/email/create-email-service.js';
import { createSupabaseAuthService } from '../infrastructure/supabase/auth-repository.js';
import type { SupabaseClients } from '../infrastructure/supabase/clients.js';
import { EnforceRateLimit, RateLimitExceeded } from '../application/security/rate-limit.js';
import { SupabaseRateLimitRepository } from '../infrastructure/supabase/rate-limit-repository.js';
import { ApiError } from '../shared/errors.js';
import { readAccessToken, requireUser } from './auth-context.js';
import { clearSessionCookies, setSessionCookies } from './session-cookies.js';
import { createMobileBrowserSession } from '../infrastructure/supabase/mobile-browser-session.js';

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
	const isSuperAdmin = serialized.can_access_platform === true;
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
	const { email } = createEmailService(env, clients);
	const auth = createSupabaseAuthService(clients, {
		// Aviso fora de banda, como na troca de senha: quem perdeu a conta precisa
		// saber que o CPF mudou. Falha aqui é registrada, nunca devolvida.
		documentChanged: (notice) =>
			email
				.sendDocumentChangedNotice(notice, `document-changed-${notice.email}-${notice.changedAt.getTime()}`)
				.catch((error: unknown) => {
					app.log.error({ err: error, email: notice.email }, 'Falha ao enviar o aviso de CPF alterado.');
				}),
	});
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

	// Native clients keep explicit credentials in secure device storage. Browser
	// routes retain HttpOnly cookies and never return credentials in their body.
	const sessionRoute = (
		path: string,
		handler: (request: FastifyRequest, reply: FastifyReply, native: boolean) => Promise<unknown>,
	) => {
		app.post(path, (request, reply) => handler(request, reply, false));
		app.post(path.replace('/api/auth/', '/api/auth/mobile/'), (request, reply) => {
			reply.header('cache-control', 'private, no-store');
			return handler(request, reply, true);
		});
	};

	await app.register(async (browser) => {
		// Load a first-party document before the native WebView submits the form.
		// WKWebView's initial POST can send Origin: null and must remain blocked
		// by the same origin checks that protect all browser writes.
		browser.get('/api/auth/mobile/web-session', async (_request, reply) =>
			reply
				.header('cache-control', 'private, no-store')
				.header('referrer-policy', 'same-origin')
				.header('x-frame-options', 'DENY')
				.header(
					'content-security-policy',
					"default-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
				)
				.type('text/html; charset=utf-8').send(`<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Abrindo checkout · Flouvi</title></head>
<body><p role="status">Preparando sua página segura…</p>
<form id="flouvi-mobile-session" action="/api/auth/mobile/web-session" method="post" hidden>
<input type="hidden" name="access_token"><input type="hidden" name="destination">
</form></body></html>`),
		);
		browser.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string' }, (_request, body, done) => {
			done(null, Object.fromEntries(new URLSearchParams(String(body))));
		});
		browser.post('/api/auth/mobile/web-session', { bodyLimit: 16_384 }, async (request, reply) => {
			const input = z
				.object({
					access_token: z.string().min(1).max(8192),
					destination: z
						.string()
						.max(300)
						.regex(/^\/(?:eventos\/[a-z0-9-]+\/checkout|perfil(?:\?section=[a-z-]+|\/ingressos\/[a-f0-9-]{36})?)$/),
				})
				.strict()
				.parse(request.body);
			await limit('mobile-browser-ip', request.ip, 20, 600);
			const { user } = await auth.authenticate(input.access_token);
			await limit('mobile-browser-user', user.id, 10, 600);
			const profile = await auth.serialize(user);
			if (profile.status !== 'active') throw new ApiError('Conta indisponível.', 403, 'ACCOUNT_INACTIVE');
			const session = await createMobileBrowserSession(clients, user.id);
			setSessionCookies(reply, env, session);
			reply.header('cache-control', 'private, no-store');
			reply.header('referrer-policy', 'no-referrer');
			return reply.code(303).redirect(`${env.WEB_URL}${input.destination}`);
		});
	});

	sessionRoute('/api/auth/register', async (request, reply, native) => {
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
			birthDate: input.birth_date,
			redirectTo: `${env.WEB_URL}/confirmar-email`,
		});
		if (result.session) {
			if (!native) setSessionCookies(reply, env, result.session);
			return reply.code(201).send({
				success: true,
				confirmationRequired: false,
				user: await auth.serialize(result.user),
				redirect: '/perfil',
				...(native ? { session: result.session } : {}),
			});
		}
		return reply.code(201).send({
			success: true,
			confirmationRequired: true,
			email: input.email,
			message: 'Enviamos um código de confirmação para o seu e-mail.',
		});
	});

	sessionRoute('/api/auth/register/confirm', async (request, reply, native) => {
		const input = emailConfirmationSchema.parse(request.body);
		await Promise.all([
			limit('auth-confirm-ip', request.ip, 30, 600),
			limit('auth-confirm-account', input.email.toLowerCase(), 10, 600),
		]);
		const result = await auth.confirmEmail(input.email, input.token);
		if (!native) setSessionCookies(reply, env, result.session);
		return { ...(await sessionPayload(auth, result.user)), ...(native ? { session: result.session } : {}) };
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

	sessionRoute('/api/auth/login', async (request, reply, native) => {
		const input = credentialsSchema.parse(request.body);
		await Promise.all([
			limit('auth-login-ip', request.ip, 50, 300),
			limit('auth-login-account', input.email.toLowerCase(), 10, 300),
		]);
		const result = await auth.login(input.email, input.password);
		if (!native) setSessionCookies(reply, env, result.session);
		return { ...(await sessionPayload(auth, result.user)), ...(native ? { session: result.session } : {}) };
	});

	app.get('/api/auth/me', async (request) => {
		const context = await requireUser(request, auth);
		const user = await auth.serialize(context.user);
		const organizerStatus = user.organizer?.status ?? null;
		return {
			user,
			isOrganizer: user.role === 'admin' || user.role === 'organizer' || organizerStatus === 'active',
			isSuperAdmin: user.can_access_platform === true,
			organizerProfile: user.organizer,
			organizerStatus,
			hasPendingOrganizerRequest: organizerStatus === 'pending',
			canAutoConfirmPhone: env.APP_ENV === 'development',
		};
	});

	sessionRoute('/api/auth/refresh', async (request, reply, native) => {
		await limit('auth-refresh', request.ip, 30, 60);
		const body = z.object({ refresh_token: z.string().optional() }).parse(request.body ?? {});
		const refreshToken = body.refresh_token ?? (native ? undefined : request.cookies.refresh_token);
		if (!refreshToken) throw new ApiError('Token de atualização ausente.', 401, 'MISSING_REFRESH_TOKEN');
		const result = await auth.refresh(refreshToken);
		if (!native) setSessionCookies(reply, env, result.session);
		return { success: true, user: await auth.serialize(result.user), ...(native ? { session: result.session } : {}) };
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
		const input = z
			.object({ token_hash: z.string().min(1).max(512), password: newPasswordSchema })
			.strict()
			.parse(request.body);
		await limit('auth-password-reset', request.ip, 5, 600);
		await auth.resetPassword(input.token_hash, input.password);
		return { success: true };
	});

	app.patch('/api/user/profile', async (request) => {
		const context = await requireUser(request, auth);
		const input = updateProfileSchema.parse(request.body);
		// A troca de CPF checa a senha atual; o orçamento evita que uma sessão
		// roubada use o campo para adivinhá-la.
		if (input.document !== undefined) await limit('user-document-change', context.user.id, 5, 900);
		try {
			const user = await auth.updateProfile(context.user, input, {
				ip: request.ip,
				userAgent: request.headers['user-agent'],
			});
			return { success: true, user };
		} catch (error) {
			if (error instanceof DocumentAlreadyInUse) {
				throw new ApiError('Este CPF já está cadastrado em outra conta.', 409, 'DOCUMENT_ALREADY_IN_USE', {
					field: 'document',
				});
			}
			throw error;
		}
	});

	app.post('/api/user/email/request', async (request) => {
		const context = await requireUser(request, auth);
		const { email } = resendEmailConfirmationSchema.strict().parse(request.body);
		const refreshToken = request.cookies.refresh_token;
		if (!refreshToken) throw new ApiError('Sessão incompleta. Entre novamente.', 401, 'MISSING_REFRESH_TOKEN');
		await limit('user-email-request', context.user.id, 5, 900);
		await auth.requestMissingEmail(context.user, { accessToken: context.accessToken, refreshToken }, email);
		return { success: true };
	});
	app.post('/api/user/email/confirm', async (request) => {
		const context = await requireUser(request, auth);
		const { email, token } = emailConfirmationSchema.strict().parse(request.body);
		await limit('user-email-confirm', context.user.id, 10, 900);
		const user = await auth.confirmMissingEmail(context.user, email, token);
		return { success: true, user };
	});

	app.post('/api/user/phone/request', async (request) => {
		const context = await requireUser(request, auth);
		const { phone } = phoneVerificationRequestSchema.parse(request.body);
		const refreshToken = request.cookies.refresh_token;
		if (!refreshToken) throw new ApiError('Sessão incompleta. Entre novamente.', 401, 'MISSING_REFRESH_TOKEN');
		await limit('user-phone-request', context.user.id, 5, 900);
		// Em desenvolvimento não há provedor de SMS: o clique confirma na hora, para
		// que o resto do fluxo (cadastro completo, organizador) possa ser testado.
		if (env.APP_ENV === 'development') {
			const user = await auth.confirmPhoneWithoutCode(context.user, phone);
			return { success: true, verified: true, user, message: 'Telefone confirmado automaticamente (desenvolvimento).' };
		}
		await auth.requestPhoneVerification(context.user, { accessToken: context.accessToken, refreshToken }, phone);
		return { success: true, message: 'Enviamos um código por SMS para o telefone informado.' };
	});

	app.post('/api/user/phone/confirm', async (request) => {
		const context = await requireUser(request, auth);
		const { phone, token } = phoneVerificationConfirmSchema.parse(request.body);
		await limit('user-phone-confirm', context.user.id, 10, 900);
		const user = await auth.confirmPhoneVerification(context.user, phone, token);
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
					request.log.error({ err: error, userId: context.user.id }, 'Falha ao enviar o aviso de senha alterada.');
				});
		}

		return { success: true, otherSessionsRevoked };
	});
}
