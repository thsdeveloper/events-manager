import type { PlacePrediction, PlacesGateway } from '../../application/external/external-service.js';
import { ApiError } from '../../shared/errors.js';

interface GooglePlacesResponse {
	predictions?: Array<{
		description?: string;
		place_id?: string;
		structured_formatting?: { main_text?: string; secondary_text?: string };
	}>;
}

export class GooglePlacesGateway implements PlacesGateway {
	constructor(private readonly apiKey: string) {}

	async search(input: string): Promise<PlacePrediction[]> {
		const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
		url.searchParams.set('input', input);
		url.searchParams.set('language', 'pt-BR');
		url.searchParams.set('types', 'geocode');
		url.searchParams.set('key', this.apiKey);
		const response = await fetch(url);
		if (!response.ok) throw new ApiError('Falha ao consultar o serviço de endereços.', 502, 'PLACES_ERROR');
		const body = (await response.json()) as GooglePlacesResponse;
		return (body.predictions ?? [])
			.filter((item): item is typeof item & { description: string; place_id: string } =>
				Boolean(item.description && item.place_id),
			)
			.map((item) => ({
				placeId: item.place_id,
				description: item.description,
				mainText: item.structured_formatting?.main_text ?? item.description,
				secondaryText: item.structured_formatting?.secondary_text ?? null,
			}));
	}
}
