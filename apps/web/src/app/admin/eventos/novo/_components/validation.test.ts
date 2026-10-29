/**
 * A descrição do evento agora é HTML do editor de texto rico. O mínimo de
 * caracteres vale para o texto que a pessoa lê, não para as tags.
 */
import { describe, expect, it } from 'vitest';
import { detailsSchema, scheduleSchema, ticketsSchema } from './validation';

const words = (count: number) => Array.from({ length: count }, () => 'palavra').join(' ');

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
