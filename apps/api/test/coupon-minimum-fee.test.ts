import { describe, it, expect, vi } from 'vitest';
import { CouponService, type CouponRepository } from '../src/application/coupons/coupon-service.js';
import { partialMock } from './support/index.js';
describe('coupon preview pricing', () => {
	it('recomputes the current unit fee instead of trusting a stale cached buyer price', async () => {
		const repo = partialMock<CouponRepository>({
			getFeeConfiguration: vi.fn().mockResolvedValue({ platform_fee_percentage: 5, platform_fee_minimum: 3 }),
			findTicketPrices: vi
				.fn()
				.mockResolvedValue([{ id: 't', price: 10, buyer_price: 10.5, service_fee_type: 'passed_to_buyer' }]),
			findActiveByCode: vi.fn().mockResolvedValue({
				code: 'PROMO',
				discount_type: 'percentage',
				discount_value: 10,
				starts_at: null,
				expires_at: null,
				max_uses: null,
				uses: 0,
			}),
		});
		expect(
			await new CouponService(repo).apply({ eventId: 'e', code: 'PROMO', items: [{ ticketId: 't', quantity: 2 }] }),
		).toMatchObject({ subtotal: 26, discount: 2.6, total: 23.4 });
	});
});
