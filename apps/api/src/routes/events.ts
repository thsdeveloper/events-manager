import { eventInputSchema, eventPatchSchema } from '@events-manager/contracts';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createSupabaseAuthService } from '../infrastructure/supabase/auth-repository.js';
import { requireUser } from './auth-context.js';
import { EventNotFound, EventService, OrganizerRequired } from '../application/events/event-service.js';
import type { SupabaseClients } from '../infrastructure/supabase/clients.js';
import { SupabaseEventRepository } from '../infrastructure/supabase/event-repository.js';
import { ApiError } from '../shared/errors.js';

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
	const events = new EventService(new SupabaseEventRepository(clients));

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
		return { data: await events.listForUser(context.user.id) };
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
		const input = eventInputSchema.parse(request.body);
		try {
			return reply.code(201).send(await events.create(context.user.id, input));
		} catch (error) {
			mapEventError(error);
		}
	});

	app.get('/api/events/:id', async (request) => {
		const context = await requireUser(request, auth);
		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
		try {
			return await events.getForUser(context.user.id, id);
		} catch (error) {
			mapEventError(error);
		}
	});

	app.patch('/api/events/:id', async (request) => {
		const context = await requireUser(request, auth);
		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
		const input = eventPatchSchema.parse(request.body);
		try {
			return await events.update(context.user.id, id, input);
		} catch (error) {
			mapEventError(error);
		}
	});

	app.delete('/api/events/:id', async (request, reply) => {
		const context = await requireUser(request, auth);
		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
		try {
			await events.delete(context.user.id, id);
			return reply.code(204).send();
		} catch (error) {
			mapEventError(error);
		}
	});
}
