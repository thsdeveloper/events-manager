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
