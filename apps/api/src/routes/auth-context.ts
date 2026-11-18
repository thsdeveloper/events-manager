import type { FastifyRequest } from 'fastify';
import type { AuthService } from '../application/auth/auth-service.js';
import { z } from 'zod';
import { ApiError } from '../shared/errors.js';

export function readAccessToken(request: FastifyRequest): string | null {
	const cookieToken = request.cookies.access_token;
	if (cookieToken) return cookieToken;
	const authorization = request.headers.authorization;
	return authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
}

export function requireUser(request: FastifyRequest, auth: AuthService) {
	return auth.authenticate(readAccessToken(request));
}

export const ACTIVE_ORGANIZER_COOKIE = 'active_organizer_id';
export const ACTIVE_EVENT_COOKIE = 'active_event';

/** The preference is scoped to the current organization and checked on every request. */
export async function resolveActiveEvent(request: FastifyRequest, auth: AuthService, organizerId: string) {
	const preference = z
		.tuple([z.string().uuid(), z.string().uuid()])
		.safeParse(request.cookies?.[ACTIVE_EVENT_COOKIE]?.split(':'));
	if (!preference.success || preference.data[0] !== organizerId) return null;
	const eventId = preference.data[1];
	try {
		await auth.assertOrganizerOwnsEvent(organizerId, eventId);
		return eventId;
	} catch (error) {
		// Deleted/transferred events cannot leave the workspace stuck on an obsolete selection.
		if (error instanceof ApiError && error.code === 'EVENT_NOT_FOUND') return null;
		throw error;
	}
}

export async function requireOrganizer(request: FastifyRequest, auth: AuthService) {
	const context = await requireUser(request, auth);
	// The cookie only expresses a preference; ownership is verified before it is
	// honoured, so a forged value cannot reach another user's organization.
	const preferred = request.cookies?.[ACTIVE_ORGANIZER_COOKIE];
	const organizer = await auth.requireOrganizer(context.user.id, preferred);
	return { ...context, organizer, eventId: await resolveActiveEvent(request, auth, organizer.id) };
}

export async function requireSuperAdmin(request: FastifyRequest, auth: AuthService) {
	const context = await requireUser(request, auth);
	return { ...context, profile: await auth.requireSuperAdmin(context.user.id) };
}
