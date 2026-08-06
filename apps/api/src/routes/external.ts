import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { EventCoverService, PlacesService } from '../application/external/external-service.js';
import { MediaService } from '../application/media/media-service.js';
import type { ApiEnv } from '../config/env.js';
import { GooglePlacesGateway } from '../infrastructure/external/google-places-gateway.js';
import { OpenAICoverGenerator } from '../infrastructure/external/openai-cover-generator.js';
import type { SupabaseClients } from '../infrastructure/supabase/clients.js';
import { createSupabaseAuthService } from '../infrastructure/supabase/auth-repository.js';
import { SupabaseEventCategoryReader } from '../infrastructure/supabase/event-category-reader.js';
import { SupabaseMediaRepository } from '../infrastructure/supabase/media-repository.js';
import { ApiError } from '../shared/errors.js';
import { requireOrganizer } from './auth-context.js';

export async function externalRoutes(app: FastifyInstance, options: { env: ApiEnv; clients: SupabaseClients }) {
	const { env, clients } = options;
	const auth = createSupabaseAuthService(clients);
	const places = new PlacesService(
		env.GOOGLE_PLACES_API_KEY ? new GooglePlacesGateway(env.GOOGLE_PLACES_API_KEY) : null,
	);

	app.get('/api/places/search', async (request) => {
		const { input } = z.object({ input: z.string().default('') }).parse(request.query);
		return places.search(input);
	});

	app.post('/api/ai/generate-cover', async (request) => {
		const context = await requireOrganizer(request, auth);
		if (!env.OPENAI_API_KEY) throw new ApiError('OpenAI não está configurada.', 503, 'OPENAI_NOT_CONFIGURED');
		const input = z
			.object({
				title: z.string().trim().min(1),
				short_description: z.string().optional(),
				description: z.string().optional(),
				categoryId: z.string().uuid().optional(),
			})
			.parse(request.body);
		const covers = new EventCoverService(
			new SupabaseEventCategoryReader(clients),
			new OpenAICoverGenerator(env.OPENAI_API_KEY),
			new MediaService(new SupabaseMediaRepository(clients)),
		);
		return covers.generate({
			categoryId: input.categoryId,
			description: input.description,
			shortDescription: input.short_description,
			title: input.title,
			userId: context.user.id,
		});
	});
}
