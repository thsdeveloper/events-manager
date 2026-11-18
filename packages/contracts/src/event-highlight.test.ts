import { describe, expect, it } from 'vitest';
import { cmsPageBlockInputSchema } from './cms.js';

describe('automatic event highlight block', () => {
	it('defaults to a slider of the five latest events without manually entered event content', () => {
		const result = cmsPageBlockInputSchema.safeParse({ collection: 'block_event_highlight', item: {} });
		expect(result.success).toBe(true);
		if (result.success)
			expect(result.data.item).toEqual({
				display_mode: 'slider',
				max_items: 5,
				image_position: 'right',
				button_label: 'Comprar ingressos',
			});
	});

	it.each([
		['max_items', 0],
		['max_items', 13],
		['max_items', 1.5],
		['display_mode', 'unknown'],
		['image_position', 'outside'],
		['button_label', ''],
		['button_label', 'x'.repeat(61)],
	])('rejects invalid %s at the corresponding field', (field, value) => {
		const result = cmsPageBlockInputSchema.safeParse({ collection: 'block_event_highlight', item: { [field]: value } });
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error.issues.map((issue) => issue.path.join('.'))).toContain(`item.${field}`);
	});

	it('supports a single latest event and a custom call to action', () => {
		const result = cmsPageBlockInputSchema.safeParse({
			collection: 'block_event_highlight',
			item: {
				display_mode: 'single',
				max_items: '3',
				image_position: 'center',
				button_label: 'Ver evento',
			},
		});
		expect(result.success).toBe(true);
		if (result.success)
			expect(result.data.item).toMatchObject({ display_mode: 'single', max_items: 3, button_label: 'Ver evento' });
	});
});
