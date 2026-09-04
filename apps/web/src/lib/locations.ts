import type { City, CityWithState, State } from '@events-manager/contracts';

/**
 * Minúsculas e sem acento, para que "sao paulo" encontre "São Paulo" e
 * "uberlandia" encontre "Uberlândia".
 */
export function normalizeForSearch(value: string) {
	return value
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.trim();
}

/**
 * Cache no escopo do módulo. Os dados do IBGE não mudam durante a sessão, então
 * cada lista é buscada uma vez por aba e voltar a um estado já visitado é
 * instantâneo — sem estado global nem provider, o que deixa o seletor utilizável
 * em qualquer árvore da aplicação.
 *
 * O que fica guardado é a *promessa*, não o resultado: dois seletores montando
 * ao mesmo tempo compartilham a mesma requisição em vez de dispararem duas. Uma
 * falha é removida do cache para que a próxima tentativa refaça a busca.
 */
let statesRequest: Promise<State[]> | null = null;
const citiesByState = new Map<number, Promise<City[]>>();
const citiesById = new Map<number, Promise<CityWithState>>();

async function getJson<T>(url: string): Promise<T> {
	const response = await fetch(url);
	if (!response.ok) {
		const problem = (await response.json().catch(() => null)) as { detail?: string } | null;
		throw new Error(problem?.detail ?? 'Não foi possível carregar as localidades.');
	}

	return response.json() as Promise<T>;
}

export function fetchStates() {
	if (!statesRequest) {
		statesRequest = getJson<State[]>('/api/locations/states').catch((error: unknown) => {
			statesRequest = null;
			throw error;
		});
	}

	return statesRequest;
}

export function fetchCitiesByState(stateId: number) {
	const cached = citiesByState.get(stateId);
	if (cached) return cached;

	const request = getJson<City[]>(`/api/locations/states/${stateId}/cities`).catch((error: unknown) => {
		citiesByState.delete(stateId);
		throw error;
	});
	citiesByState.set(stateId, request);

	return request;
}

export function fetchCity(cityId: number) {
	const cached = citiesById.get(cityId);
	if (cached) return cached;

	const request = getJson<CityWithState>(`/api/locations/cities/${cityId}`).catch((error: unknown) => {
		citiesById.delete(cityId);
		throw error;
	});
	citiesById.set(cityId, request);

	return request;
}

/** "Uberlândia - MG", o mesmo rótulo que a API grava em `profiles.location`. */
export function describeCity(city: { name: string; state: { uf: string } }) {
	return `${city.name} - ${city.state.uf}`;
}

export interface SearchableOption<T> {
	option: T;
	search: string;
}

/**
 * Filtra e ordena as opções já normalizadas, devolvendo no máximo `limit` itens.
 *
 * Quem começa com o termo vem antes de quem apenas o contém: digitando "uber",
 * "Uberaba" e "Uberlândia" ficam acima de "Nova Uberaba". O corte existe porque
 * desenhar centenas de itens a cada tecla trava a digitação — com o campo de
 * busca logo acima, ninguém rola até o item 100.
 */
export function filterByName<T>(entries: SearchableOption<T>[], query: string, limit: number) {
	const term = normalizeForSearch(query);
	if (!term) return entries.slice(0, limit).map((entry) => entry.option);

	const prefix: T[] = [];
	const contains: T[] = [];
	for (const entry of entries) {
		if (entry.search.startsWith(term)) prefix.push(entry.option);
		else if (entry.search.includes(term)) contains.push(entry.option);
		// Já há prefixos suficientes para encher a lista: o resto não seria exibido.
		if (prefix.length >= limit) break;
	}

	return [...prefix, ...contains].slice(0, limit);
}

/** Quantas opções casam com o termo, para a lista dizer o que ficou de fora. */
export function countMatches<T>(entries: SearchableOption<T>[], query: string) {
	const term = normalizeForSearch(query);
	if (!term) return entries.length;

	return entries.reduce((count, entry) => (entry.search.includes(term) ? count + 1 : count), 0);
}
