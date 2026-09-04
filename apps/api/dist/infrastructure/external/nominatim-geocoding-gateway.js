import { ApiError } from '../../shared/errors.js';
/** Splits "Praça da Sé, Sé, São Paulo, SP" into its headline and the rest. */
function splitDisplayName(displayName, name) {
    const parts = displayName.split(',').map((part) => part.trim());
    const mainText = name?.trim() || parts[0] || displayName;
    // `name` may already span several comma-separated parts, so strip it as a
    // prefix rather than assuming the headline is exactly the first part.
    const secondaryText = displayName.startsWith(mainText)
        ? displayName.slice(mainText.length).replace(/^\s*,\s*/, '')
        : parts.slice(1).join(', ');
    return { mainText, secondaryText: secondaryText || null };
}
function toPrediction(place) {
    const latitude = Number(place.lat);
    const longitude = Number(place.lon);
    if (!place.display_name || !Number.isFinite(latitude) || !Number.isFinite(longitude))
        return null;
    const { mainText, secondaryText } = splitDisplayName(place.display_name, place.name);
    return {
        placeId: String(place.place_id ?? `${place.osm_type}-${place.osm_id}`),
        description: place.display_name,
        mainText,
        secondaryText,
        latitude,
        longitude,
    };
}
/**
 * OpenStreetMap's geocoder. Unlike the Places autocomplete it returns
 * coordinates with the search result, so pinning a venue costs one request.
 *
 * Their usage policy requires an identifying User-Agent and caps traffic at
 * roughly one request per second, which is why callers rate limit this and the
 * browser never talks to Nominatim directly.
 */
export class NominatimGeocodingGateway {
    contactUrl;
    baseUrl;
    constructor(contactUrl, baseUrl = 'https://nominatim.openstreetmap.org') {
        this.contactUrl = contactUrl;
        this.baseUrl = baseUrl;
    }
    async request(path, params) {
        const url = new URL(path, this.baseUrl);
        url.searchParams.set('format', 'jsonv2');
        for (const [key, value] of Object.entries(params))
            url.searchParams.set(key, value);
        const response = await fetch(url, {
            headers: {
                'Accept-Language': 'pt-BR',
                'User-Agent': `events-manager (${this.contactUrl})`,
            },
        });
        // Upstream throttling is a distinct, recoverable condition: surfacing it as a
        // bad gateway would tell the user to report a bug instead of to wait.
        if (response.status === 429) {
            throw new ApiError('O serviço de endereços recusou a consulta por excesso de requisições. Tente novamente em instantes.', 429, 'PLACES_RATE_LIMITED');
        }
        if (!response.ok)
            throw new ApiError('Falha ao consultar o serviço de endereços.', 502, 'PLACES_ERROR');
        return response.json();
    }
    async search(input) {
        const body = (await this.request('/search', {
            q: input,
            addressdetails: '1',
            limit: '6',
        }));
        return (Array.isArray(body) ? body : []).map(toPrediction).filter((item) => item !== null);
    }
    async reverse(latitude, longitude) {
        const body = (await this.request('/reverse', {
            lat: String(latitude),
            lon: String(longitude),
            addressdetails: '1',
        }));
        // Reverse geocoding answers with the nearest address, whose coordinates are
        // the matched feature's — the caller wants the pin it dropped kept intact.
        const prediction = body && typeof body === 'object' ? toPrediction(body) : null;
        return prediction ? { ...prediction, latitude, longitude } : null;
    }
}
//# sourceMappingURL=nominatim-geocoding-gateway.js.map