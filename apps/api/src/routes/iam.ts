import {
	iamInvitationSchema,
	iamMemberInputSchema,
	iamRoleInputSchema,
	iamTokenSchema,
} from '@events-manager/contracts';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { SupabaseClients } from '../infrastructure/supabase/clients.js';
import type { ApiEnv } from '../config/env.js';
import { TeamService, type InvitationMailer } from '../application/iam/team-service.js';
import { AuthorizationService } from '../application/iam/authorization-service.js';
import { SupabaseIamRepository } from '../infrastructure/supabase/iam-repository.js';
import { createSupabaseAuthService } from '../infrastructure/supabase/auth-repository.js';
import { createEmailService } from '../infrastructure/email/create-email-service.js';
import { EnforceRateLimit, RateLimitExceeded } from '../application/security/rate-limit.js';
import { SupabaseRateLimitRepository } from '../infrastructure/supabase/rate-limit-repository.js';
import { requireOrganizer, requireUser } from './auth-context.js';
import { setActiveOrganizerCookie } from './session-cookies.js';
import { ApiError } from '../shared/errors.js';
export async function iamRoutes(
	app: FastifyInstance,
	options: { clients: SupabaseClients; env: ApiEnv; mailer?: InvitationMailer },
) {
	const { clients, env } = options;
	const auth = createSupabaseAuthService(clients);
	const repository = new SupabaseIamRepository(clients);
	const email = options.mailer ? null : createEmailService(env, clients).email;
	const team = new TeamService(
		repository,
		options.mailer ?? { send: (notice, key) => email!.sendTeamInvitation(notice, key) },
		env.WEB_URL,
	);
	const authorization = new AuthorizationService(repository);
	const limiter = new EnforceRateLimit(new SupabaseRateLimitRepository(clients.admin));
	const params = z.object({ id: z.string().uuid() });
	const paging = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1) });
	const limit = async (userId: string, accepting = false) => {
		try {
			await limiter.execute({
				scope: accepting ? 'iam-accept' : 'iam-invite',
				subject: userId,
				limit: accepting ? 30 : 20,
				windowSeconds: accepting ? 300 : 3600,
			});
		} catch (error) {
			if (error instanceof RateLimitExceeded)
				throw new ApiError('Muitas solicitações. Aguarde antes de tentar novamente.', 429, 'RATE_LIMITED');
			throw error;
		}
	};
	app.get('/api/organizer/iam/access', async (request, reply) => {
		const { user, organizer } = await requireOrganizer(request, auth);
		reply.header('cache-control', 'private, no-store');
		const access = await authorization.context(user.id, organizer.id);
		if (!access?.active) throw new ApiError('Seu acesso à organização está desativado.', 403, 'PERMISSION_DENIED');
		return access;
	});
	for (const resource of ['members', 'roles', 'invitations', 'permissions', 'events'] as const) {
		app.get(`/api/organizer/iam/${resource}`, async (request, reply) => {
			const { user, organizer } = await requireOrganizer(request, auth);
			reply.header('cache-control', 'private, no-store');
			return { data: await team[resource](user.id, organizer.id) };
		});
	}
	app.get('/api/organizer/iam/audit', async (request) => {
		const { user, organizer } = await requireOrganizer(request, auth);
		return team.audit(user.id, organizer.id, paging.parse(request.query).page);
	});
	app.post('/api/organizer/iam/invitations', async (request, reply) => {
		const { user, organizer } = await requireOrganizer(request, auth);
		const input = iamInvitationSchema.parse(request.body);
		await limit(user.id);
		return reply.code(201).send(await team.invite(user.id, organizer.id, input));
	});
	app.post('/api/organizer/iam/invitations/:id/resend', async (request) => {
		const { user, organizer } = await requireOrganizer(request, auth);
		const { id } = params.parse(request.params);
		await limit(user.id);
		return team.resend(user.id, organizer.id, id);
	});
	app.delete('/api/organizer/iam/invitations/:id', async (request) => {
		const { user, organizer } = await requireOrganizer(request, auth);
		return team.mutate(user.id, organizer.id, 'invitations.revoke', params.parse(request.params));
	});
	app.post('/api/organizer/iam/roles', async (request, reply) => {
		const { user, organizer } = await requireOrganizer(request, auth);
		return reply
			.code(201)
			.send(await team.mutate(user.id, organizer.id, 'roles.create', iamRoleInputSchema.parse(request.body)));
	});
	app.patch('/api/organizer/iam/roles/:id', async (request) => {
		const { user, organizer } = await requireOrganizer(request, auth);
		return team.mutate(user.id, organizer.id, 'roles.update', {
			...params.parse(request.params),
			...iamRoleInputSchema.parse(request.body),
		});
	});
	app.delete('/api/organizer/iam/roles/:id', async (request) => {
		const { user, organizer } = await requireOrganizer(request, auth);
		return team.mutate(user.id, organizer.id, 'roles.delete', params.parse(request.params));
	});
	app.patch('/api/organizer/iam/members/:id', async (request) => {
		const { user, organizer } = await requireOrganizer(request, auth);
		return team.mutate(user.id, organizer.id, 'members.update', {
			...params.parse(request.params),
			...iamMemberInputSchema.parse(request.body),
		});
	});
	app.delete('/api/organizer/iam/members/:id', async (request) => {
		const { user, organizer } = await requireOrganizer(request, auth);
		return team.mutate(user.id, organizer.id, 'members.remove', params.parse(request.params));
	});
	app.post('/api/iam/invitations/accept', async (request, reply) => {
		const { user } = await requireUser(request, auth);
		const { token } = iamTokenSchema.parse(request.body);
		await limit(user.id, true);
		const result = await team.accept(user.id, token);
		await auth.activateOrganizer(user.id, result.organizationId);
		setActiveOrganizerCookie(reply, env, result.organizationId);
		return result;
	});
}
