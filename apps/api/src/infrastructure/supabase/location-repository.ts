import type { City, CityWithState, State } from '@events-manager/contracts';
import { LocationService, type LocationRepository } from '../../application/locations/location-service.js';
import type { SupabaseClients } from './clients.js';

// `search_name` fica de fora das respostas: o cliente carrega a lista inteira do
// estado uma vez e normaliza os nomes localmente, então repetir a versão sem
// acento no JSON só engordaria o payload.
const stateSelection = 'id,uf,name';
const citySelection = 'id,state_id,name';

export class SupabaseLocationRepository implements LocationRepository {
	constructor(private readonly clients: SupabaseClients) {}

	async listStates(): Promise<State[]> {
		const { data, error } = await this.clients.admin
			.from('states')
			.select(stateSelection)
			.order('name', { ascending: true });
		if (error) throw error;

		return (data ?? []) as State[];
	}

	async listCitiesByState(stateId: number): Promise<City[]> {
		// Ordena por `search_name` para que a acentuação não jogue "Água Boa" para
		// o fim da lista, como aconteceria ordenando pelo nome exibido.
		const { data, error } = await this.clients.admin
			.from('cities')
			.select(citySelection)
			.eq('state_id', stateId)
			.order('search_name', { ascending: true });
		if (error) throw error;

		return (data ?? []) as City[];
	}

	async findCity(cityId: number): Promise<CityWithState | null> {
		const { data, error } = await this.clients.admin
			.from('cities')
			.select(`${citySelection},state:states(${stateSelection})`)
			.eq('id', cityId)
			.maybeSingle();
		if (error) throw error;

		return (data as CityWithState | null) ?? null;
	}
}

export function createLocationService(clients: SupabaseClients) {
	return new LocationService(new SupabaseLocationRepository(clients));
}
