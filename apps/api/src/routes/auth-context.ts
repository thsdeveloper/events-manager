import type { FastifyRequest } from 'fastify';
import type { AuthService } from '../application/auth/auth-service.js';

export function readAccessToken(request: FastifyRequest): string | null {
	const cookieToken = request.cookies.access_token;
	if (cookieToken) return cookieToken;
	const authorization = request.headers.authorization;
	return authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
}

export function requireUser(request: FastifyRequest, auth: AuthService) {
	return auth.authenticate(readAccessToken(request));
}

export async function requireOrganizer(request: FastifyRequest, auth: AuthService) {
	const context = await requireUser(request, auth);
	return { ...context, organizer: await auth.requireOrganizer(context.user.id) };
}

export async function requireSuperAdmin(request: FastifyRequest, auth: AuthService) {
	const context = await requireUser(request, auth);
	return { ...context, profile: await auth.requireSuperAdmin(context.user.id) };
}
