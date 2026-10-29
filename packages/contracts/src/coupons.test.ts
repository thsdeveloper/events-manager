/**
 * Fronteira HTTP do cupom. O schema recusa no cadastro aquilo que nunca poderia
 * virar um desconto válido, para que o organizador veja o erro no formulário em
 * vez de descobrir no checkout de quem compra.
 */
import { describe, expect, it } from 'vitest';
import { couponInputSchema, couponApplySchema } from './coupons.js';

const validCoupon = {
	code: 'JOVENS10',
	discount_type: 'percentage' as const,
	discount_value: 10,
};

describe('couponInputSchema', () => {
	it('accepts the minimum an organizer needs to type', () => {
		expect(couponInputSchema.parse(validCoupon)).toMatchObject({ code: 'JOVENS10', discount_value: 10 });
	});

	it('stores the code in upper case, however the organizer typed it', () => {
		expect(couponInputSchema.parse({ ...validCoupon, code: ' jovens10 ' }).code).toBe('JOVENS10');
	});

	it('refuses a code with characters that break a URL or a copy and paste', () => {
		expect(couponInputSchema.safeParse({ ...validCoupon, code: 'CUPOM 10%' }).success).toBe(false);
		expect(couponInputSchema.safeParse({ ...validCoupon, code: 'AB' }).success).toBe(false);
	});

	it('refuses a percentage above one hundred, which would invert the total', () => {
		expect(couponInputSchema.safeParse({ ...validCoupon, discount_value: 101 }).success).toBe(false);
		expect(couponInputSchema.safeParse({ ...validCoupon, discount_value: 100 }).success).toBe(true);
	});

	it('allows a flat discount larger than one hundred reais', () => {
		expect(couponInputSchema.safeParse({ ...validCoupon, discount_type: 'fixed', discount_value: 150 }).success).toBe(
			true,
		);
	});

	it('refuses a discount of zero or less', () => {
		expect(couponInputSchema.safeParse({ ...validCoupon, discount_value: 0 }).success).toBe(false);
		expect(couponInputSchema.safeParse({ ...validCoupon, discount_value: -5 }).success).toBe(false);
	});

	it('refuses a window that ends before it starts', () => {
		const inverted = {
			...validCoupon,
			starts_at: '2026-10-10T00:00:00.000Z',
			expires_at: '2026-10-01T00:00:00.000Z',
		};

		expect(couponInputSchema.safeParse(inverted).success).toBe(false);
	});

	it('accepts a window in the right order and an open-ended one', () => {
		expect(
			couponInputSchema.safeParse({
				...validCoupon,
				starts_at: '2026-10-01T00:00:00.000Z',
				expires_at: '2026-10-10T00:00:00.000Z',
			}).success,
		).toBe(true);
		expect(couponInputSchema.safeParse({ ...validCoupon, expires_at: '2026-10-10T00:00:00.000Z' }).success).toBe(true);
	});

	it('refuses a usage limit that is not a positive whole number', () => {
		expect(couponInputSchema.safeParse({ ...validCoupon, max_uses: 0 }).success).toBe(false);
		expect(couponInputSchema.safeParse({ ...validCoupon, max_uses: 2.5 }).success).toBe(false);
		expect(couponInputSchema.safeParse({ ...validCoupon, max_uses: 50 }).success).toBe(true);
	});
});

describe('couponApplySchema', () => {
	it('normalizes the code the buyer types at checkout', () => {
		expect(couponApplySchema.parse({ code: ' jovens10 ' }).code).toBe('JOVENS10');
	});

	it('refuses an empty attempt instead of querying the database', () => {
		expect(couponApplySchema.safeParse({ code: '   ' }).success).toBe(false);
	});
});
