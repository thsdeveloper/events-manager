import { describe, it, expect } from 'vitest';
import { ticketMetrics } from './metrics';
describe('event ticket metrics', () => {
	it('separates paid admissions, reserved stock, released cancellations and money actually received', () => {
		expect(
			ticketMetrics([
				{ status: 'confirmed', payment_status: 'paid', quantity: 2, payment_amount: 80, inventory_reserved: true },
				{ status: 'pending', payment_status: 'pending', quantity: 3, payment_amount: 300, inventory_reserved: true },
				{
					status: 'partial_payment',
					payment_status: 'pending',
					quantity: 1,
					payment_amount: 20,
					inventory_reserved: true,
				},
				{
					status: 'cancelled',
					payment_status: 'refunded',
					quantity: 4,
					payment_amount: 100,
					inventory_reserved: false,
				},
				{ status: 'confirmed', payment_status: 'free', quantity: 1, payment_amount: 0, inventory_reserved: true },
			]),
		).toEqual({ sold: 3, reserved: 4, cancelled: 4, revenue: 100 });
	});
});

it('uses the actual paid checkout total after coupons, keeping partial receipts separate', () => {
	expect(
		ticketMetrics([
			{ status: 'confirmed', payment_status: 'paid', quantity: 2, payment_amount: 100, total_amount: 70 },
			{ status: 'partial_payment', payment_status: 'pending', quantity: 1, payment_amount: 10, total_amount: 50 },
		]),
	).toMatchObject({ revenue: 80 });
});
