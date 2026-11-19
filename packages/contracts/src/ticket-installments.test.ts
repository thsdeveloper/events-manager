import { describe, expect, it } from 'vitest';
import { ticketInputSchema } from './schemas.js';

const ticket = {
	event_id: '00000000-0000-4000-8000-000000000010',
	title: 'Inteira',
	price: 100,
	quantity: 10,
	service_fee_type: 'absorbed',
};

describe('independent installment permissions', () => {
	it('preserves separate Pix and credit limits', () => {
		expect(
			ticketInputSchema.parse({
				...ticket,
				allow_installments: true,
				max_installments: 6,
				allow_pix_installments: true,
				max_pix_installments: 3,
				min_amount_for_pix_installments: 50,
			}),
		).toMatchObject({
			allow_installments: true,
			max_installments: 6,
			allow_pix_installments: true,
			max_pix_installments: 3,
			min_amount_for_pix_installments: 50,
		});
	});
	it('requires a Pix limit even when credit has a limit', () => {
		const result = ticketInputSchema.safeParse({
			...ticket,
			allow_installments: true,
			max_installments: 6,
			allow_pix_installments: true,
		});
		expect(result.success).toBe(false);
		if (!result.success)
			expect(result.error.issues.map((issue) => issue.path)).toContainEqual(['max_pix_installments']);
	});
	it.each([0, 1, 13, 2.5])('rejects an invalid Pix limit %s', (max_pix_installments) => {
		expect(ticketInputSchema.safeParse({ ...ticket, allow_pix_installments: true, max_pix_installments }).success).toBe(
			false,
		);
	});
	it('allows Pix installments while credit remains upfront', () => {
		expect(
			ticketInputSchema.parse({
				...ticket,
				allow_installments: false,
				allow_pix_installments: true,
				max_pix_installments: 4,
			}),
		).toMatchObject({ allow_installments: false, allow_pix_installments: true, max_pix_installments: 4 });
	});
});
