import { describe, expect, it } from 'vitest';
import { countMatches, describeCity, filterByName, normalizeForSearch } from './locations';

const entries = ['São Paulo', 'Uberaba', 'Uberlândia', 'Nova Uberaba', 'Poços de Caldas', 'Belo Horizonte'].map(
	(name) => ({ option: name, search: normalizeForSearch(name) }),
);

describe('normalizeForSearch', () => {
	it('strips accents and case so typing without them still finds the city', () => {
		expect(normalizeForSearch('São Paulo')).toBe('sao paulo');
		expect(normalizeForSearch('  Uberlândia ')).toBe('uberlandia');
		expect(normalizeForSearch("Alta Floresta D'Oeste")).toBe("alta floresta d'oeste");
	});
});

describe('filterByName', () => {
	it('finds a city typed without accents', () => {
		expect(filterByName(entries, 'sao paulo', 10)).toEqual(['São Paulo']);
		expect(filterByName(entries, 'pocos', 10)).toEqual(['Poços de Caldas']);
	});

	it('puts names that start with the term above names that merely contain it', () => {
		// "Nova Uberaba" also contains "uber", but it is not what someone typing
		// "uber" is reaching for.
		expect(filterByName(entries, 'uber', 10)).toEqual(['Uberaba', 'Uberlândia', 'Nova Uberaba']);
	});

	it('returns the head of the list when nothing was typed', () => {
		expect(filterByName(entries, '   ', 2)).toEqual(['São Paulo', 'Uberaba']);
	});

	it('never renders more than the cap, however many match', () => {
		const many = Array.from({ length: 853 }, (_, index) => `Cidade ${index}`).map((name) => ({
			option: name,
			search: normalizeForSearch(name),
		}));

		expect(filterByName(many, 'cidade', 100)).toHaveLength(100);
		expect(countMatches(many, 'cidade')).toBe(853);
	});
});

describe('describeCity', () => {
	it('builds the same label the API stores in the profile', () => {
		expect(describeCity({ name: 'Uberlândia', state: { uf: 'MG' } })).toBe('Uberlândia - MG');
	});
});
