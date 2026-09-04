import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { EventCoverService, PlacesService } from '../application/external/external-service.js';
import { MediaService } from '../application/media/media-service.js';
import { EnforceRateLimit, RateLimitExceeded } from '../application/security/rate-limit.js';
import { SupabaseRateLimitRepository } from '../infrastructure/supabase/rate-limit-repository.js';
import type { ApiEnv } from '../config/env.js';
import { NominatimGeocodingGateway } from '../infrastructure/external/nominatim-geocoding-gateway.js';
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
	const places = new PlacesService(new NominatimGeocodingGateway(env.WEB_URL));
	const rateLimit = new EnforceRateLimit(new SupabaseRateLimitRepository(clients.admin));
	// Nominatim starts refusing bursts well before a generous per-caller budget
	// would trip, so the cap is set to roughly what one person typing an address
	// needs (the picker debounces at 400ms) and no more.
	const limitGeocoding = async (scope: string, ip: string) => {
		try {
			await rateLimit.execute({ scope, subject: ip, limit: 12, windowSeconds: 60 });
		} catch (error) {
			if (error instanceof RateLimitExceeded) {
				throw new ApiError('Muitas buscas de endereço. Aguarde alguns segundos.', 429, 'RATE_LIMITED');
			}
			throw error;
		}
	};

	app.get('/api/places/search', async (request) => {
		const { input } = z.object({ input: z.string().default('') }).parse(request.query);
		if (input.trim().length < 3) return { predictions: [] };
		await limitGeocoding('places-search-ip', request.ip);
		return places.search(input);
	});

	app.get('/api/places/reverse', async (request) => {
		const { lat, lon } = z
			.object({ lat: z.coerce.number().min(-90).max(90), lon: z.coerce.number().min(-180).max(180) })
			.parse(request.query);
		await limitGeocoding('places-reverse-ip', request.ip);
		return places.reverse(lat, lon);
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
