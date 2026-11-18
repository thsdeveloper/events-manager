import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eventAIContextSchema, postalCodeSchema } from '@events-manager/contracts';
import { PostalCodeService } from '../application/external/postal-code-service.js';
import { ViaCepGateway } from '../infrastructure/external/viacep-gateway.js';
import { OpenAIDescriptionGenerator } from '../infrastructure/external/openai-description-generator.js';
import { EventDescriptionService, EventCoverService, PlacesService } from '../application/external/external-service.js';
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
import { requireOrganizer, requireUser } from './auth-context.js';

export async function externalRoutes(app: FastifyInstance, options: { env: ApiEnv; clients: SupabaseClients }) {
	const { env, clients } = options;
	const auth = createSupabaseAuthService(clients);
	const places = new PlacesService(new NominatimGeocodingGateway(env.WEB_URL));
	const postalCodes = new PostalCodeService(new ViaCepGateway());
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

	app.get('/api/places/postal-code/:code', async (request) => {
		await requireUser(request, auth);
		const { code } = z.object({ code: postalCodeSchema }).parse(request.params);
		await limitGeocoding('postal-code-ip', request.ip);
		return postalCodes.find(code);
	});

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

	for (const action of ['generate-cover', 'generate-description'] as const) {
		app.post('/api/ai/' + action, async (request) => {
			const context = await requireOrganizer(request, auth);
			const input = eventAIContextSchema.parse(request.body);
			if (!env.OPENAI_API_KEY) throw new ApiError('OpenAI não está configurada.', 503, 'OPENAI_NOT_CONFIGURED');
			try {
				await rateLimit.execute({
					scope: 'event-ai-' + action,
					subject: context.user.id,
					limit: action === 'generate-cover' ? 6 : 20,
					windowSeconds: 3600,
				});
			} catch (error) {
				if (error instanceof RateLimitExceeded)
					throw new ApiError(
						'Limite de gerações atingido. Tente mais tarde ou preencha manualmente.',
						429,
						'RATE_LIMITED',
					);
				throw error;
			}
			const categories = new SupabaseEventCategoryReader(clients);
			if (action === 'generate-description') {
				return new EventDescriptionService(categories, new OpenAIDescriptionGenerator(env.OPENAI_API_KEY)).generate(
					input,
				);
			}
			return new EventCoverService(
				categories,
				new OpenAICoverGenerator(env.OPENAI_API_KEY),
				new MediaService(new SupabaseMediaRepository(clients)),
			).generate({ ...input, userId: context.user.id });
		});
	}
}
