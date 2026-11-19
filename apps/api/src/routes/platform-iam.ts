import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
	platformInvitationSchema,
	platformMemberSchema,
	platformRoleSchema,
	iamTokenSchema,
} from '@events-manager/contracts';
import { PlatformTeamService } from '../application/iam/platform-team-service.js';
import { PlatformAuthorization } from '../application/iam/platform-authorization.js';
import type { InvitationMailer } from '../application/iam/team-service.js';
import { SupabasePlatformIamRepository } from '../infrastructure/supabase/platform-iam-repository.js';
import type { SupabaseClients } from '../infrastructure/supabase/clients.js';
import type { ApiEnv } from '../config/env.js';
import { createSupabaseAuthService } from '../infrastructure/supabase/auth-repository.js';
import { createEmailService } from '../infrastructure/email/create-email-service.js';
import { EnforceRateLimit, RateLimitExceeded } from '../application/security/rate-limit.js';
import { SupabaseRateLimitRepository } from '../infrastructure/supabase/rate-limit-repository.js';
import { ApiError } from '../shared/errors.js';
import { requireUser } from './auth-context.js';
export async function platformIamRoutes(
	app: FastifyInstance,
	options: { clients: SupabaseClients; env: ApiEnv; mailer?: InvitationMailer },
) {
	const { clients, env } = options,
		auth = createSupabaseAuthService(clients),
		repository = new SupabasePlatformIamRepository(clients);
	const email = options.mailer ? null : createEmailService(env, clients).email;
	const team = new PlatformTeamService(
		repository,
		options.mailer ?? { send: (notice, key) => email!.sendTeamInvitation(notice, key) },
		env.WEB_URL,
	);
	const authorization = new PlatformAuthorization(repository),
		limiter = new EnforceRateLimit(new SupabaseRateLimitRepository(clients.admin));
	const params = z.object({ id: z.string().uuid() }),
		base = '/api/super-admin/iam';
	async function limit(userId: string, accepting = false) {
		try {
			await limiter.execute({
				scope: accepting ? 'platform-accept' : 'platform-invite',
				subject: userId,
				limit: accepting ? 30 : 20,
				windowSeconds: accepting ? 300 : 3600,
			});
		} catch (error) {
			if (error instanceof RateLimitExceeded)
				throw new ApiError('Muitas solicitações. Aguarde antes de tentar novamente.', 429, 'RATE_LIMITED');
			throw error;
		}
	}
	app.get(`${base}/access`, async (request, reply) => {
		const { user } = await requireUser(request, auth);
		reply.header('cache-control', 'private, no-store');
		return authorization.require(user.id);
	});
	for (const resource of ['members', 'roles', 'invitations', 'permissions'] as const)
		app.get(`${base}/${resource}`, async (request) => {
			const { user } = await requireUser(request, auth);
			return { data: await team.read(user.id, resource) };
		});
	app.get(`${base}/audit`, async (request) => {
		const { user } = await requireUser(request, auth);
		const { page } = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1) }).parse(request.query);
		return team.read(user.id, 'audit', page);
	});
	app.post(`${base}/invitations`, async (request, reply) => {
		const { user } = await requireUser(request, auth);
		const input = platformInvitationSchema.parse(request.body);
		await limit(user.id);
		return reply.code(201).send(await team.invite(user.id, input));
	});
	app.post(`${base}/invitations/:id/resend`, async (request) => {
		const { user } = await requireUser(request, auth);
		const { id } = params.parse(request.params);
		await limit(user.id);
		return team.resend(user.id, id);
	});
	app.delete(`${base}/invitations/:id`, async (request) => {
		const { user } = await requireUser(request, auth);
		return team.mutate(user.id, 'invitations.revoke', params.parse(request.params));
	});
	app.post(`${base}/roles`, async (request, reply) => {
		const { user } = await requireUser(request, auth);
		return reply.code(201).send(await team.mutate(user.id, 'roles.create', platformRoleSchema.parse(request.body)));
	});
	app.patch(`${base}/roles/:id`, async (request) => {
		const { user } = await requireUser(request, auth);
		return team.mutate(user.id, 'roles.update', {
			...params.parse(request.params),
			...platformRoleSchema.parse(request.body),
		});
	});
	app.delete(`${base}/roles/:id`, async (request) => {
		const { user } = await requireUser(request, auth);
		return team.mutate(user.id, 'roles.delete', params.parse(request.params));
	});
	app.patch(`${base}/members/:id`, async (request) => {
		const { user } = await requireUser(request, auth);
		return team.mutate(user.id, 'members.update', {
			...params.parse(request.params),
			...platformMemberSchema.parse(request.body),
		});
	});
	app.delete(`${base}/members/:id`, async (request) => {
		const { user } = await requireUser(request, auth);
		return team.mutate(user.id, 'members.remove', params.parse(request.params));
	});
	app.post('/api/platform-iam/invitations/accept', async (request, reply) => {
		const { user } = await requireUser(request, auth);
		const { token } = iamTokenSchema.parse(request.body);
		await limit(user.id, true);
		reply.header('cache-control', 'private, no-store');
		return team.accept(user.id, token);
	});
}
