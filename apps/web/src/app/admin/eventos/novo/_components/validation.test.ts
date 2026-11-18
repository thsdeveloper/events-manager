/**
 * A descrição do evento agora é HTML do editor de texto rico. O mínimo de
 * caracteres vale para o texto que a pessoa lê, não para as tags.
 */
import { describe, expect, it } from 'vitest';
import { detailsSchema, scheduleSchema, ticketsSchema, locationSchema } from './validation';

const words = (count: number) => Array.from({ length: count }, () => 'palavra').join(' ');

describe('endereço presencial', () => {
	const location = {
		event_type: 'in_person',
		location_name: 'Teatro Municipal',
		location_address: 'Praça da Sé',
		show_map: false,
		location_postal_code: '01001-000',
		location_number: '10',
		location_state: 'SP',
	};
	it.each(['location_postal_code', 'location_number', 'location_state'])('exige %s para um local definido', (field) => {
		const result = locationSchema.safeParse({ ...location, [field]: '' });
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error.issues.some((issue) => issue.path[0] === field)).toBe(true);
	});
	it('aceita CEP com máscara, UF válida e dispensa endereço no local a definir', () => {
		expect(locationSchema.safeParse(location).success).toBe(true);
		expect(locationSchema.safeParse({ event_type: 'in_person', location_tbd: true }).success).toBe(true);
	});
	it.each([{ location_state: 'XX' }, { location_postal_code: '123' }])('rejeita CEP ou UF inválidos: %j', (patch) => {
		expect(locationSchema.safeParse({ ...location, ...patch }).success).toBe(false);
	});
});

describe('detailsSchema.description', () => {
	it('counts only the visible text, so formatting never inflates a short description', () => {
		const short = `<p><strong>${words(3)}</strong></p><ul><li><p>item</p></li></ul>`;
		const long = `<p>${words(15)}</p>`;

		expect(detailsSchema.safeParse({ description: short, tags: [] }).success).toBe(false);
		expect(detailsSchema.safeParse({ description: long, tags: [] }).success).toBe(true);
	});

	it('treats an empty editor (an empty paragraph) as no description', () => {
		expect(detailsSchema.safeParse({ description: '<p></p>', tags: [] }).success).toBe(false);
	});
});

describe('wizard publication rules', () => {
	it('preserves the choice to leave an event unlisted', () => {
		expect(
			ticketsSchema.parse({
				is_free: true,
				tickets: [],
				status: 'draft',
				visibility: 'unlisted',
				featured: false,
				publish_after_create: false,
			}),
		).toHaveProperty('visibility', 'unlisted');
	});
	it('rejects an event that ends at its starting time', () => {
		expect(scheduleSchema.safeParse({ start_date: '2026-12-01T18:00', end_date: '2026-12-01T18:00' }).success).toBe(
			false,
		);
	});
});
