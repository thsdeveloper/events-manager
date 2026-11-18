import { authorizedEventIds } from './iam-authorization.js';
import { eventCreateSchema, eventPatchSchema } from '@events-manager/contracts';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createSupabaseAuthService } from '../infrastructure/supabase/auth-repository.js';
import { ACTIVE_ORGANIZER_COOKIE, requireUser, resolveActiveEvent } from './auth-context.js';
import { EventNotFound, EventService, OrganizerRequired } from '../application/events/event-service.js';
import type { SupabaseClients } from '../infrastructure/supabase/clients.js';
import { SupabaseEventRepository, resolveEventOrganizer } from '../infrastructure/supabase/event-repository.js';
import { AdminService } from '../application/admin/admin-service.js';
import { SupabaseAdminRepository } from '../infrastructure/supabase/admin-repository.js';
import { ApiError } from '../shared/errors.js';
import { eventDraftRoutes } from './event-drafts.js';
import { SupabaseEventDraftRepository } from '../infrastructure/supabase/event-draft-repository.js';
import { createEventTicketGroups } from '../infrastructure/supabase/ticket-group-repository.js';

function mapEventError(error: unknown): never {
	if (error instanceof EventNotFound) throw new ApiError('Evento não encontrado.', 404, 'EVENT_NOT_FOUND');
	if (error instanceof OrganizerRequired) {
		throw new ApiError('Seu perfil de organizador ainda não está ativo.', 403, 'ORGANIZER_REQUIRED');
	}
	throw error;
}

export async function eventRoutes(app: FastifyInstance, options: { clients: SupabaseClients }) {
	const { clients } = options;
	const auth = createSupabaseAuthService(clients);
	// Tickets that arrive with a new event are created through the admin service so
	// they go through the same ownership check and platform-fee pricing as any other.
	const adminTickets = new AdminService(new SupabaseAdminRepository(clients));
	const createEvents = (preferred?: string, strict = false, eventIds: string[] | null = null) =>
		new EventService(
			new SupabaseEventRepository(clients, preferred, strict, eventIds),
			{ create: (organizerId, ticket) => adminTickets.createTicket(organizerId, ticket) },
			new SupabaseEventDraftRepository(clients, preferred, strict),
			{ create: (organizerId, eventId, groups) => createEventTicketGroups(clients, organizerId, eventId, groups) },
		);
	const eventsFor = async (userId: string, preferred?: string, eventIds: string[] | null = null) => {
		const organizer = await resolveEventOrganizer(clients, userId, preferred);
		return createEvents(organizer?.id, true, eventIds);
	};
	const events = createEvents();
	const selectedEventFor = async (request: Parameters<typeof requireUser>[0], userId: string) => {
		const organizer = await resolveEventOrganizer(clients, userId, request.cookies?.[ACTIVE_ORGANIZER_COOKIE]);
		return organizer ? resolveActiveEvent(request, auth, organizer.id) : null;
	};
	await app.register(eventDraftRoutes, { clients });

	app.get('/api/events/slug/:slug', async (request) => {
		const { slug } = z.object({ slug: z.string() }).parse(request.params);
		try {
			return await events.getPublicBySlug(slug);
		} catch (error) {
			mapEventError(error);
		}
	});

	app.get('/api/events', async (request) => {
		const context = await requireUser(request, auth);
		const eventId = await selectedEventFor(request, context.user.id);
		const data = await (
			await eventsFor(context.user.id, request.cookies?.[ACTIVE_ORGANIZER_COOKIE], authorizedEventIds(request))
		).listForUser(context.user.id);
		return { data: eventId ? data.filter((event) => event.id === eventId) : data };
	});

	app.get('/api/events/public', async (request) => {
		const query = z
			.object({
				limit: z.coerce.number().int().min(1).max(48).default(12),
				page: z.coerce.number().int().positive().default(1),
				search: z.string().trim().max(100).default(''),
			})
			.parse(request.query);
		return events.listPublic(query);
	});

	app.get('/api/event-categories', async () => ({ data: await events.listCategories() }));

	app.post('/api/events', async (request, reply) => {
		const context = await requireUser(request, auth);
		const input = eventCreateSchema.parse(request.body);
		try {
			return reply
				.code(201)
				.send(
					await (
						await eventsFor(context.user.id, request.cookies?.[ACTIVE_ORGANIZER_COOKIE], authorizedEventIds(request))
					).create(context.user.id, input),
				);
		} catch (error) {
			mapEventError(error);
		}
	});

	app.get('/api/events/:id', async (request) => {
		const context = await requireUser(request, auth);
		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
		const eventId = await selectedEventFor(request, context.user.id);
		if (eventId && eventId !== id) throw new ApiError('Evento fora da seleção atual.', 404, 'EVENT_NOT_FOUND');
		try {
			return await (
				await eventsFor(context.user.id, request.cookies?.[ACTIVE_ORGANIZER_COOKIE], authorizedEventIds(request))
			).getForUser(context.user.id, id);
		} catch (error) {
			mapEventError(error);
		}
	});

	app.patch('/api/events/:id', async (request) => {
		const context = await requireUser(request, auth);
		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
		const input = eventPatchSchema.parse(request.body);
		try {
			return await (
				await eventsFor(context.user.id, request.cookies?.[ACTIVE_ORGANIZER_COOKIE], authorizedEventIds(request))
			).update(context.user.id, id, input);
		} catch (error) {
			mapEventError(error);
		}
	});

	app.delete('/api/events/:id', async (request, reply) => {
		const context = await requireUser(request, auth);
		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
		try {
			await (
				await eventsFor(context.user.id, request.cookies?.[ACTIVE_ORGANIZER_COOKIE], authorizedEventIds(request))
			).delete(context.user.id, id);
			return reply.code(204).send();
		} catch (error) {
			mapEventError(error);
		}
	});
}
