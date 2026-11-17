import { describe, expect, it } from 'vitest';
import { eventDraftInputSchema } from './event-drafts.js';

describe('legacy sales periods in event drafts', () => {
	it('moves the old event window to tickets without widening their existing periods', () => {
		const values = eventDraftInputSchema.parse({
			values: {
				registration_start: '2026-11-01T12:00:00Z',
				registration_end: '2026-12-01T12:00:00Z',
				tickets: [
					{ title: 'Lote 1', sale_start_date: '2026-10-01T12:00:00Z', sale_end_date: '2026-11-20T12:00:00Z' },
					{ title: 'Lote 2' },
				],
			},
		}).values;
		expect(values).not.toHaveProperty('registration_start');
		expect(values).not.toHaveProperty('registration_end');
		expect(values.tickets?.[0]).toMatchObject({
			sale_start_date: '2026-11-01T12:00:00Z',
			sale_end_date: '2026-11-20T12:00:00Z',
		});
		expect(values.tickets?.[1]).toMatchObject({
			sale_start_date: '2026-11-01T12:00:00Z',
			sale_end_date: '2026-12-01T12:00:00Z',
		});
	});
	it('keeps disjoint periods unavailable instead of opening sales', () => {
		const values = eventDraftInputSchema.parse({
			values: {
				registration_start: '2026-12-01T12:00:00Z',
				registration_end: '2026-12-30T12:00:00Z',
				tickets: [
					{ title: 'Encerrado', sale_start_date: '2026-10-01T12:00:00Z', sale_end_date: '2026-11-01T12:00:00Z' },
				],
			},
		}).values;
		expect(values.tickets?.[0]).toMatchObject({
			status: 'inactive',
			sale_start_date: '2026-10-01T12:00:00Z',
			sale_end_date: '2026-11-01T12:00:00Z',
		});
	});
	it('does not change incomplete or current drafts that have no old event window', () => {
		const values = { title: 'Novo evento', tickets: [{ title: 'Lote', sale_start_date: 'em breve' }] };
		expect(eventDraftInputSchema.parse({ values }).values).toEqual(values);
	});
});
