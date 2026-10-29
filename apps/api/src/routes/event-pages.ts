import { eventPageLayoutSchema } from '@events-manager/contracts';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { EventPageService } from '../application/events/event-page-service.js';
import { EventNotFound, EventService } from '../application/events/event-service.js';
import { createSupabaseAuthService } from '../infrastructure/supabase/auth-repository.js';
import type { SupabaseClients } from '../infrastructure/supabase/clients.js';
import { SupabaseEventPageRepository } from '../infrastructure/supabase/event-page-repository.js';
import { SupabaseEventRepository } from '../infrastructure/supabase/event-repository.js';
import { ApiError } from '../shared/errors.js';
import { requireUser } from './auth-context.js';

const params = z.object({ id: z.string().uuid() });
const draftBody = z.object({ draft: eventPageLayoutSchema });

function mapError(error: unknown): never {
	if (error instanceof EventNotFound) throw new ApiError('Evento não encontrado.', 404, 'EVENT_NOT_FOUND');
	throw error;
}

/** Página exclusiva do evento: rascunho, publicação e volta ao layout padrão. */
export async function eventPageRoutes(app: FastifyInstance, options: { clients: SupabaseClients }) {
	const { clients } = options;
	const auth = createSupabaseAuthService(clients);
	const pages = new EventPageService(
		new SupabaseEventPageRepository(clients),
		new EventService(new SupabaseEventRepository(clients)),
	);

	app.get('/api/events/:id/page', async (request) => {
		const context = await requireUser(request, auth);
		const { id } = params.parse(request.params);
		return pages.get(context.user.id, id).catch(mapError);
	});

	app.put('/api/events/:id/page', async (request) => {
		const context = await requireUser(request, auth);
		const { id } = params.parse(request.params);
		const { draft } = draftBody.parse(request.body);
		return pages.saveDraft(context.user.id, id, draft).catch(mapError);
	});

	app.post('/api/events/:id/page/publish', async (request) => {
		const context = await requireUser(request, auth);
		const { id } = params.parse(request.params);
		return pages.publish(context.user.id, id).catch(mapError);
	});

	app.post('/api/events/:id/page/unpublish', async (request) => {
		const context = await requireUser(request, auth);
		const { id } = params.parse(request.params);
		return pages.unpublish(context.user.id, id).catch(mapError);
	});
}
