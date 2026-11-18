import { presentIamResponse } from '../application/iam/presentation.js';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { hasPermission, type IamAccess } from '@events-manager/contracts';
import { AuthorizationService } from '../application/iam/authorization-service.js';
import { organizationRoutePolicy } from '../application/iam/route-policy.js';
import { createSupabaseAuthService } from '../infrastructure/supabase/auth-repository.js';
import { SupabaseIamRepository } from '../infrastructure/supabase/iam-repository.js';
import { resolveEventOrganizer } from '../infrastructure/supabase/event-repository.js';
import type { SupabaseClients } from '../infrastructure/supabase/clients.js';
import { ApiError } from '../shared/errors.js';
import { requireUser, ACTIVE_ORGANIZER_COOKIE } from './auth-context.js';
declare module 'fastify' {
	interface FastifyRequest {
		iam?: { access: IamAccess; eventIds: string[] | null; resourceEventId?: string };
	}
}
export function installIamAuthorization(app: FastifyInstance, clients: SupabaseClients) {
	const auth = createSupabaseAuthService(clients);
	const repository = new SupabaseIamRepository(clients);
	const authorization = new AuthorizationService(repository);
	app.addHook('preHandler', async (request, reply) => {
		const policy = organizationRoutePolicy(
			request.method,
			request.routeOptions.url ?? '',
			request.body as Record<string, unknown> | undefined,
		);
		if (policy === null) return;
		const context = await requireUser(request, auth);
		reply.header('cache-control', 'private, no-store');
		const organization = await resolveEventOrganizer(
			clients,
			context.user.id,
			request.cookies[ACTIVE_ORGANIZER_COOKIE],
			Boolean(request.cookies[ACTIVE_ORGANIZER_COOKIE]),
		);
		if (!organization) throw new ApiError('Você não participa desta organização.', 403, 'ORGANIZER_REQUIRED');
		if (policy === 'deny') {
			await repository.recordDenied({
				userId: context.user.id,
				organizationId: organization.id,
				action: 'organization.read',
			});
			throw new ApiError('Operação administrativa não autorizada.', 403, 'PERMISSION_DENIED');
		}
		if (policy === 'member') {
			const access = await authorization.context(context.user.id, organization.id);
			if (!access?.active) throw new ApiError('Seu acesso à organização está desativado.', 403, 'PERMISSION_DENIED');
			request.iam = { access, eventIds: null };
			return;
		}
		if (policy.scope === 'event') {
			const params = request.params as Record<string, unknown>;
			const body = request.body as Record<string, unknown> | undefined;
			let eventId = z
				.string()
				.uuid()
				.parse(policy.bodyField ? body?.[policy.bodyField] : params[policy.parameter ?? 'id']);
			if (policy.resource) {
				const resourceEventId = await repository.resourceEvent(policy.resource, eventId);
				if (!resourceEventId) throw new ApiError('Recurso não encontrado.', 404, 'RESOURCE_NOT_FOUND');
				eventId = resourceEventId;
			}
			let access: IamAccess | undefined;
			for (const action of policy.actions)
				access = await authorization.require(context.user.id, organization.id, action, eventId);
			request.iam = { access: access!, eventIds: [eventId], resourceEventId: eventId };
		} else if (policy.scope === 'list') {
			request.iam = await authorization.requireList(context.user.id, organization.id, policy.actions);
			const query = request.query as Record<string, unknown>;
			const ids = [query.event_id, query.eventId, query.eventIds]
				.filter((v): v is string => typeof v === 'string')
				.flatMap((v) => v.split(','))
				.filter(Boolean);
			for (const id of ids)
				for (const action of policy.actions)
					await authorization.require(context.user.id, organization.id, action, z.string().uuid().parse(id));
		} else {
			let access: IamAccess | undefined;
			for (const action of policy.actions)
				access = await authorization.require(context.user.id, organization.id, action);
			request.iam = { access: access!, eventIds: null };
			if (
				request.routeOptions.url === '/api/organizer/profile' &&
				request.method === 'PATCH' &&
				!access!.isOwner &&
				request.body &&
				Object.hasOwn(request.body as object, 'document')
			)
				throw new ApiError('Somente o proprietário pode alterar a identificação fiscal.', 403, 'OWNER_REQUIRED');
		}
	});
	app.addHook('onSend', async (request, reply, payload) => {
		if (
			!request.iam ||
			typeof payload !== 'string' ||
			!String(reply.getHeader('content-type') ?? '').includes('application/json')
		)
			return payload;
		return JSON.stringify(presentIamResponse(request.routeOptions.url ?? '', JSON.parse(payload), request.iam.access));
	});
}
/** Intersects every list with the permission scope, independently of Header selection. */
export function authorizedEventIds(request: FastifyRequest): string[] | null {
	return request.iam?.eventIds ?? null;
}
export function restrictEventRows<T extends { id: string }>(request: FastifyRequest, rows: T[]): T[] {
	const allowed = authorizedEventIds(request);
	return allowed === null ? rows : rows.filter((row) => allowed.includes(row.id));
}
export function authorizeSelectedEvent(request: FastifyRequest, eventId: string | null) {
	if (!eventId || !request.iam) return eventId;
	return hasPermission(request.iam.access, 'events.read', eventId) ? eventId : null;
}
