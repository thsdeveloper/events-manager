import { ApiError } from '../../shared/errors.js';
/**
 * Estados e municípios do IBGE. A lista só muda por migration, então cada
 * consulta é resolvida uma única vez por processo e servida da memória depois —
 * são 27 estados e 5.605 cidades no total, algo em torno de 300 KB, e evita uma
 * ida ao banco a cada vez que alguém abre o seletor.
 *
 * O cache guarda a *promessa*, não o resultado: várias requisições simultâneas
 * em um processo recém-iniciado compartilham a mesma consulta em vez de
 * dispararem 27 iguais. Uma falha é removida do cache para que a próxima
 * requisição tente de novo, em vez de servir o erro para sempre.
 */
export class LocationService {
    repository;
    states = null;
    citiesByState = new Map();
    constructor(repository) {
        this.repository = repository;
    }
    listStates() {
        if (!this.states) {
            this.states = this.repository.listStates().catch((error) => {
                this.states = null;
                throw error;
            });
        }
        return this.states;
    }
    async listCitiesByState(stateId) {
        const states = await this.listStates();
        // Valida contra a lista carregada em vez de consultar o banco: um código
        // inexistente vira 404 sem custo, e não uma lista vazia indistinguível de
        // um estado sem municípios.
        if (!states.some((state) => state.id === stateId)) {
            throw new ApiError('Estado não encontrado.', 404, 'STATE_NOT_FOUND');
        }
        const cached = this.citiesByState.get(stateId);
        if (cached)
            return cached;
        const cities = this.repository.listCitiesByState(stateId).catch((error) => {
            this.citiesByState.delete(stateId);
            throw error;
        });
        this.citiesByState.set(stateId, cities);
        return cities;
    }
    async findCity(cityId) {
        const city = await this.repository.findCity(cityId);
        if (!city)
            throw new ApiError('Município não encontrado.', 404, 'CITY_NOT_FOUND');
        return city;
    }
}
//# sourceMappingURL=location-service.js.map