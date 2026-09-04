import type { FastifyReply } from 'fastify';
import type { AuthSession } from '../application/auth/auth-service.js';
import type { ApiEnv } from '../config/env.js';

export function setSessionCookies(reply: FastifyReply, env: ApiEnv, session: AuthSession) {
	const common = {
		path: '/',
		httpOnly: true,
		secure: env.NODE_ENV === 'production',
		sameSite: 'lax' as const,
	};
	reply.setCookie('access_token', session.accessToken, { ...common, maxAge: session.expiresIn });
	reply.setCookie('refresh_token', session.refreshToken, { ...common, maxAge: 60 * 60 * 24 * 30 });
}

export function clearSessionCookies(reply: FastifyReply, env: ApiEnv) {
	const options = {
		path: '/',
		httpOnly: true,
		secure: env.NODE_ENV === 'production',
		sameSite: 'lax' as const,
	};
	reply.clearCookie('access_token', options);
	reply.clearCookie('refresh_token', options);
}

/**
 * Remembers the organization the user is working in. Not httpOnly-sensitive in
 * itself — the API re-checks ownership on every request — but it is scoped and
 * expires like the session so a shared machine does not leak the choice.
 */
export function setActiveOrganizerCookie(reply: FastifyReply, env: ApiEnv, organizerId: string) {
	reply.setCookie('active_organizer_id', organizerId, {
		path: '/',
		httpOnly: true,
		secure: env.NODE_ENV === 'production',
		sameSite: 'lax' as const,
		maxAge: 60 * 60 * 24 * 30,
	});
}
