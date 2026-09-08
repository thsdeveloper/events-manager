import { z } from 'zod';
import { createLocationService } from '../infrastructure/supabase/location-repository.js';
const stateIdSchema = z.object({ stateId: z.coerce.number().int().positive() });
const cityIdSchema = z.object({ cityId: z.coerce.number().int().positive() });
/**
 * Os dados do IBGE só mudam quando uma migration muda, então as respostas são
 * cacheáveis por bastante tempo: um dia no navegador e uma semana em qualquer
 * proxy, servindo a versão antiga enquanto revalida.
 */
const IMMUTABLE_REFERENCE_DATA = 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400';
export async function locationRoutes(app, options) {
    const locations = createLocationService(options.clients);
    app.get('/api/locations/states', async (_request, reply) => {
        reply.header('cache-control', IMMUTABLE_REFERENCE_DATA);
        return locations.listStates();
    });
    /**
     * Devolve o estado inteiro de uma vez, e não uma busca paginada: o maior deles
     * (Minas Gerais) tem 853 municípios, o que dá cerca de 12 KB comprimidos. Com a
     * lista na mão, o filtro por digitação acontece no cliente e responde
     * instantaneamente, sem uma requisição por tecla.
     */
    app.get('/api/locations/states/:stateId/cities', async (request, reply) => {
        const { stateId } = stateIdSchema.parse(request.params);
        reply.header('cache-control', IMMUTABLE_REFERENCE_DATA);
        return locations.listCitiesByState(stateId);
    });
    /** Resolve um município isolado, para telas que só têm o código salvo. */
    app.get('/api/locations/cities/:cityId', async (request, reply) => {
        const { cityId } = cityIdSchema.parse(request.params);
        reply.header('cache-control', IMMUTABLE_REFERENCE_DATA);
        return locations.findCity(cityId);
    });
}
//# sourceMappingURL=locations.js.map