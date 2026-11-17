import { eventDraftInputSchema } from '@events-manager/contracts';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { EventDraftService } from '../application/events/event-draft-service.js';
import { createSupabaseAuthService } from '../infrastructure/supabase/auth-repository.js';
import type { SupabaseClients } from '../infrastructure/supabase/clients.js';
import { SupabaseEventDraftRepository } from '../infrastructure/supabase/event-draft-repository.js';
import { ACTIVE_ORGANIZER_COOKIE, requireUser } from './auth-context.js';
import { resolveEventOrganizer } from '../infrastructure/supabase/event-repository.js';

export async function eventDraftRoutes(app: FastifyInstance, options: { clients: SupabaseClients }) {
	const auth = createSupabaseAuthService(options.clients);
	const service = async (userId: string, preferred?: string) => {
		const organizer = await resolveEventOrganizer(options.clients, userId, preferred);
		return new EventDraftService(new SupabaseEventDraftRepository(options.clients, organizer?.id, true));
	};
	const params = z.object({ id: z.string().uuid() });
	app.get('/api/event-drafts', async (request) => {
		const context = await requireUser(request, auth);
		return {
			data: await (
				await service(context.user.id, request.cookies?.[ACTIVE_ORGANIZER_COOKIE])
			).listForUser(context.user.id),
		};
	});
	app.post('/api/event-drafts', async (request, reply) => {
		const context = await requireUser(request, auth);
		const input = eventDraftInputSchema.parse(request.body);
		return reply
			.code(201)
			.send(
				await (
					await service(context.user.id, request.cookies?.[ACTIVE_ORGANIZER_COOKIE])
				).create(context.user.id, input),
			);
	});
	app.get('/api/event-drafts/:id', async (request) => {
		const context = await requireUser(request, auth);
		const { id } = params.parse(request.params);
		return (await service(context.user.id, request.cookies?.[ACTIVE_ORGANIZER_COOKIE])).getForUser(context.user.id, id);
	});
	app.put('/api/event-drafts/:id', async (request) => {
		const context = await requireUser(request, auth);
		const { id } = params.parse(request.params);
		const input = eventDraftInputSchema.parse(request.body);
		return (await service(context.user.id, request.cookies?.[ACTIVE_ORGANIZER_COOKIE])).update(
			context.user.id,
			id,
			input,
		);
	});
	app.delete('/api/event-drafts/:id', async (request, reply) => {
		const context = await requireUser(request, auth);
		const { id } = params.parse(request.params);
		await (await service(context.user.id, request.cookies?.[ACTIVE_ORGANIZER_COOKIE])).delete(context.user.id, id);
		return reply.code(204).send();
	});
}
