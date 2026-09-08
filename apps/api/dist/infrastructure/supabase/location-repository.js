import { LocationService } from '../../application/locations/location-service.js';
// `search_name` fica de fora das respostas: o cliente carrega a lista inteira do
// estado uma vez e normaliza os nomes localmente, então repetir a versão sem
// acento no JSON só engordaria o payload.
const stateSelection = 'id,uf,name';
const citySelection = 'id,state_id,name';
export class SupabaseLocationRepository {
    clients;
    constructor(clients) {
        this.clients = clients;
    }
    async listStates() {
        const { data, error } = await this.clients.admin
            .from('states')
            .select(stateSelection)
            .order('name', { ascending: true });
        if (error)
            throw error;
        return (data ?? []);
    }
    async listCitiesByState(stateId) {
        // Ordena por `search_name` para que a acentuação não jogue "Água Boa" para
        // o fim da lista, como aconteceria ordenando pelo nome exibido.
        const { data, error } = await this.clients.admin
            .from('cities')
            .select(citySelection)
            .eq('state_id', stateId)
            .order('search_name', { ascending: true });
        if (error)
            throw error;
        return (data ?? []);
    }
    async findCity(cityId) {
        const { data, error } = await this.clients.admin
            .from('cities')
            .select(`${citySelection},state:states(${stateSelection})`)
            .eq('id', cityId)
            .maybeSingle();
        if (error)
            throw error;
        return data ?? null;
    }
}
export function createLocationService(clients) {
    return new LocationService(new SupabaseLocationRepository(clients));
}
//# sourceMappingURL=location-repository.js.map