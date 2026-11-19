import { presentPlatformData } from '../application/iam/platform-data.js';
import type { FastifyInstance } from 'fastify';
import type { PlatformAccess } from '@events-manager/contracts';
import type { SupabaseClients } from '../infrastructure/supabase/clients.js';
import { SupabasePlatformIamRepository } from '../infrastructure/supabase/platform-iam-repository.js';
import { createSupabaseAuthService } from '../infrastructure/supabase/auth-repository.js';
import { PlatformAuthorization } from '../application/iam/platform-authorization.js';
import { platformRoutePolicy } from '../application/iam/platform-policy.js';
import { requireUser } from './auth-context.js';
import { ApiError } from '../shared/errors.js';
declare module 'fastify' {
	interface FastifyRequest {
		platformAccess?: PlatformAccess;
	}
}
export function installPlatformAuthorization(app: FastifyInstance, clients: SupabaseClients) {
	const repository = new SupabasePlatformIamRepository(clients);
	const authorization = new PlatformAuthorization(repository);
	const auth = createSupabaseAuthService(clients);
	app.addHook('onSend', async (request, reply, payload) => {
		const path = request.routeOptions.url ?? '';
		if (
			!request.platformAccess ||
			reply.statusCode >= 400 ||
			typeof payload !== 'string' ||
			!/^\/api\/super-admin\/(?:organizers|finance)(?:\/|$)/.test(path)
		)
			return payload;
		if (!String(reply.getHeader('content-type') ?? '').includes('application/json')) return payload;
		return JSON.stringify(presentPlatformData(request.platformAccess, JSON.parse(payload)));
	});
	app.addHook('preHandler', async (request, reply) => {
		const policy = platformRoutePolicy(request.method, request.routeOptions.url ?? '', request.body, request.query);
		if (policy === null) return;
		const { user } = await requireUser(request, auth);
		reply.header('cache-control', 'private, no-store');
		if (policy === 'deny') {
			await repository.denied(user.id, 'unknown_route');
			throw new ApiError('Operação não autorizada na plataforma.', 403, 'PLATFORM_PERMISSION_DENIED');
		}
		request.platformAccess = await authorization.require(user.id, policy === 'member' ? [] : policy);
	});
}
