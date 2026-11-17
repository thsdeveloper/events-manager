import { describe, expect, it, vi } from 'vitest';
import { calculatePlatformFee, calculateOrganizerNet } from '../src/application/payments/fees.js';
import { buildCheckoutPlan, applyDiscountToPlan } from '../src/application/payments/checkout-plan.js';
import { AdminService, type AdminRepository } from '../src/application/admin/admin-service.js';
import { partialMock } from './support/index.js';
const config = {
	platform_fee_percentage: 5,
	platform_fee_minimum: 3,
	pix_fee_fixed: 0,
	card_fee_percentage: 0,
	card_fee_fixed: 0,
	card_installment_2_6_percentage: 0,
	card_installment_7_12_percentage: 0,
	boleto_fee_fixed: 0,
};
const ticket = {
	id: 't',
	price: 10,
	quantity: 100,
	quantitySold: 0,
	saleStartDate: null,
	saleEndDate: null,
	minQuantityPerPurchase: 1,
	maxQuantityPerPurchase: 5,
	visibility: 'public',
	status: 'active',
	serviceFeeType: 'passed_to_buyer',
};
describe('minimum fee per ticket', () => {
	it('charges the configured minimum', () => expect(calculatePlatformFee(10, config)).toBe(3));
	it('keeps free tickets free', () => expect(calculatePlatformFee(0, config)).toBe(0));
	it('charges one minimum per unit in a cart', () =>
		expect(
			buildCheckoutPlan({ configuration: config, selections: [{ ticketId: 't', quantity: 2 }], tickets: [ticket] })[0],
		).toMatchObject({ baseAmount: 20, platformFee: 6, serviceFee: 6, totalAmount: 26 }));
	it('charges absorbed fees to the organizer', () =>
		expect(
			buildCheckoutPlan({
				configuration: config,
				selections: [{ ticketId: 't', quantity: 2 }],
				tickets: [{ ...ticket, serviceFeeType: 'absorbed' }],
			})[0],
		).toMatchObject({ platformFee: 6, serviceFee: 0, totalAmount: 20 }));
	it('prices a new ticket with the same minimum', async () => {
		const repo = partialMock<AdminRepository>({
			listOwnedEventIds: vi.fn().mockResolvedValue(['e']),
			getConfiguration: vi.fn().mockResolvedValue(config),
			getPlatformFeePercentage: vi.fn().mockResolvedValue(5),
			createTicket: vi.fn().mockResolvedValue({}),
		});
		await new AdminService(repo).createTicket('org', {
			event_id: 'e',
			title: 'Lote',
			price: 10,
			quantity: 10,
			service_fee_type: 'passed_to_buyer',
		});
		expect(repo.createTicket).toHaveBeenCalledWith(expect.objectContaining({ buyer_price: 13 }));
	});
});

describe('absorbed minimum fee', () => {
	it('rejects a paid price that cannot cover the unit platform fee', async () => {
		const repo = partialMock<AdminRepository>({
			listOwnedEventIds: vi.fn().mockResolvedValue(['e']),
			getConfiguration: vi.fn().mockResolvedValue(config),
			createTicket: vi.fn(),
		});
		await expect(
			new AdminService(repo).createTicket('org', {
				event_id: 'e',
				title: 'Lote',
				price: 2,
				quantity: 10,
				service_fee_type: 'absorbed',
			}),
		).rejects.toMatchObject({ statusCode: 422, code: 'TICKET_PRICE_BELOW_FEE' });
		expect(repo.createTicket).not.toHaveBeenCalled();
	});
	it('rejects a legacy ticket that became too cheap to absorb a newly configured minimum', () => {
		expect(() =>
			buildCheckoutPlan({
				configuration: config,
				selections: [{ ticketId: 't', quantity: 2 }],
				tickets: [{ ...ticket, price: 2, serviceFeeType: 'absorbed' }],
			}),
		).toThrow('fee_exceeds_price');
	});
});

describe('project coupon policy for fee snapshots', () => {
	function cart(feeType = 'passed_to_buyer') {
		return buildCheckoutPlan({
			configuration: config,
			selections: [{ ticketId: 't', quantity: 2 }],
			tickets: [{ ...ticket, serviceFeeType: feeType }],
		});
	}
	it('sets fees to zero when the discount covers the entire purchase', () => {
		const plan = cart();
		expect(applyDiscountToPlan(plan, 26)[0]).toMatchObject({
			baseAmount: 20,
			quantity: 2,
			totalAmount: 0,
			platformFee: 0,
			serviceFee: 0,
		});
		expect(plan[0]).toMatchObject({ platformFee: 6, serviceFee: 6, totalAmount: 26 });
	});
	it('limits per-line fees to the remaining amount across multiple units', () => {
		expect(applyDiscountToPlan(cart(), 24)[0]).toMatchObject({
			baseAmount: 20,
			quantity: 2,
			totalAmount: 2,
			platformFee: 2,
			serviceFee: 2,
		});
	});
	it('limits the absorbed fee without creating a buyer service charge', () => {
		expect(applyDiscountToPlan(cart('absorbed'), 19)[0]).toMatchObject({
			totalAmount: 1,
			platformFee: 1,
			serviceFee: 0,
		});
	});
	it('preserves the original fees when the payment still covers them', () => {
		expect(applyDiscountToPlan(cart(), 5)[0]).toMatchObject({ totalAmount: 21, platformFee: 6, serviceFee: 6 });
	});
});

describe('organizer receipts after coupons', () => {
	it('never allocates the undiscounted base as a payout after a full coupon', () =>
		expect(calculateOrganizerNet(20, 0, 0, 0)).toBe(0));
	it('deducts fees from the actual money received after a discount', () =>
		expect(calculateOrganizerNet(20, 5, 2, 1)).toBe(2));
});
