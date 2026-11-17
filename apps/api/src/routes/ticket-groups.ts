import { ticketGroupInputSchema, ticketGroupPatchSchema, ticketOrderInputSchema } from '@events-manager/contracts';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { TicketGroupService } from '../application/admin/ticket-group-service.js';
import { SupabaseTicketGroupRepository } from '../infrastructure/supabase/ticket-group-repository.js';
import { createSupabaseAuthService } from '../infrastructure/supabase/auth-repository.js';
import type { SupabaseClients } from '../infrastructure/supabase/clients.js';
import { requireOrganizer } from './auth-context.js';
import { ApiError } from '../shared/errors.js';
const params = z.object({ eventId: z.string().uuid(), id: z.string().uuid().optional() });
export async function ticketGroupRoutes(app: FastifyInstance, options: { clients: SupabaseClients }) {
	const auth = createSupabaseAuthService(options.clients);
	const groups = new TicketGroupService(new SupabaseTicketGroupRepository(options.clients));
	app.get('/api/admin/eventos/:eventId/grupos', async (request) => {
		const { organizer } = await requireOrganizer(request, auth);
		const { eventId } = params.parse(request.params);
		return { data: await groups.list(organizer.id, eventId) };
	});
	app.post('/api/admin/eventos/:eventId/grupos', async (request, reply) => {
		const { organizer } = await requireOrganizer(request, auth);
		const { eventId } = params.parse(request.params);
		const input = ticketGroupInputSchema.parse(request.body);
		if (input.event_id !== eventId)
			throw new ApiError('Evento do grupo não corresponde à página.', 422, 'INVALID_TICKET_GROUP');
		return reply.code(201).send(await groups.create(organizer.id, eventId, input));
	});
	app.patch('/api/admin/eventos/:eventId/grupos/:id', async (request) => {
		const { organizer } = await requireOrganizer(request, auth);
		const { eventId, id } = params.parse(request.params);
		return groups.update(organizer.id, eventId, id!, ticketGroupPatchSchema.parse(request.body));
	});
	app.delete('/api/admin/eventos/:eventId/grupos/:id', async (request) => {
		const { organizer } = await requireOrganizer(request, auth);
		const { eventId, id } = params.parse(request.params);
		await groups.remove(organizer.id, eventId, id!);
		return { success: true };
	});
	app.post('/api/admin/eventos/:eventId/ingressos/ordem', async (request) => {
		const { organizer } = await requireOrganizer(request, auth);
		const { eventId } = params.parse(request.params);
		await groups.reorder(organizer.id, eventId, ticketOrderInputSchema.parse(request.body).ticket_ids);
		return { success: true };
	});
}
