/**
 * O cupom no checkout de verdade.
 *
 * Validar o código numa rota à parte não basta: o que a pessoa paga é o que o
 * `PaymentService` grava na inscrição e manda para o gateway. Estes testes
 * exercitam esse caminho, com o desconto vindo do serviço de cupom e não do
 * corpo da requisição.
 */
import { describe, expect, it, vi } from 'vitest';
import type { Database } from '@events-manager/contracts';
import {
	CouponExhausted,
	CouponExpired,
	CouponNotFound,
	CouponNotStarted,
} from '../src/application/coupons/coupon-service.js';
import {
	PaymentService,
	type CheckoutEvent,
	type CouponApplier,
	type PaymentRepository,
} from '../src/application/payments/payment-service.js';
import type { PaymentGateway } from '../src/application/payments/payment-gateway.js';
import type { EnforceRateLimit } from '../src/application/security/rate-limit.js';
import type { GetCheckoutStatus } from '../src/application/payments/get-checkout-status.js';
import type { ManageTicketInventory } from '../src/application/payments/manage-ticket-inventory.js';
import { partialMock, TEST_EVENT_ID, TEST_USER_ID } from './support/index.js';

const TICKET_ID = '00000000-0000-4000-8000-000000000050';

const configuration = {
	platform_fee_percentage: 0,
	pix_fee_fixed: 0,
	card_fee_percentage: 0,
	card_fee_fixed: 0,
	card_installment_2_6_percentage: 0,
	card_installment_7_12_percentage: 0,
	boleto_fee_fixed: 0,
};

const event = {
	id: TEST_EVENT_ID,
	title: 'Congresso',
	registration_start: null,
	registration_end: null,
	tickets: [
		{
			id: TICKET_ID,
			title: 'Inteira',
			price: 100,
			quantity: 100,
			quantity_sold: 0,
			status: 'active',
			visibility: 'public',
			service_fee_type: 'absorbed',
			min_quantity_per_purchase: 1,
			max_quantity_per_purchase: 10,
			sale_start_date: null,
			sale_end_date: null,
			provider_product_id: null,
		},
	],
} as unknown as CheckoutEvent;

function buildService(coupons?: CouponApplier) {
	const registrations: Database['public']['Tables']['event_registrations']['Insert'][] = [];
	const repository = partialMock<PaymentRepository>({
		findCheckoutEvent: vi.fn().mockResolvedValue(event),
		getConfiguration: vi.fn().mockResolvedValue(configuration),
		createRegistration: vi.fn(async (input) => {
			registrations.push(input);

			return { ...input, id: `r-${registrations.length}` };
		}),
		// Cada unidade vira um ingresso nominal; o pedido em si é o que estes testes olham.
		createRegistrationTickets: vi.fn(async (rows: Array<Record<string, unknown>>) =>
			rows.map((row, index) => ({ ...row, id: `t-${index + 1}` })),
		),
		recordTransaction: vi.fn(),
		updateRegistration: vi.fn(),
	});

	const service = new PaymentService(
		repository,
		partialMock<PaymentGateway>({ provider: 'mock' }),
		partialMock<ManageTicketInventory>({ reserve: vi.fn().mockResolvedValue(undefined) }),
		partialMock<GetCheckoutStatus>({}),
		partialMock<EnforceRateLimit>({ execute: vi.fn().mockResolvedValue(undefined) }),
		'https://events.local',
		() => new Date('2026-09-14T12:00:00.000Z'),
		coupons,
	);

	return { registrations, service };
}

const logger = { error: () => {} };
const cart = {
	eventId: TEST_EVENT_ID,
	participantInfo: { name: 'Ana', email: 'ana@events.local' },
	tickets: [{ ticketId: TICKET_ID, quantity: 2 }],
};

describe('PaymentService.checkout com cupom', () => {
	it('charges the full price when no coupon is sent', async () => {
		const { registrations, service } = buildService();

		await service.checkout(TEST_USER_ID, cart, logger);

		expect(registrations[0].total_amount).toBe(200);
	});

	it('charges the discounted total when a coupon applies', async () => {
		const coupons = partialMock<CouponApplier>({
			validate: vi.fn().mockResolvedValue({ code: 'JOVENS10', discount: 20, subtotal: 200, total: 180 }),
		});
		const { registrations, service } = buildService(coupons);

		await service.checkout(TEST_USER_ID, { ...cart, couponCode: 'jovens10' }, logger);

		expect(registrations[0].total_amount).toBe(180);
	});

	it('asks the coupon service for the discount, never trusting an amount from the request', async () => {
		const coupons = partialMock<CouponApplier>({
			validate: vi.fn().mockResolvedValue({ code: 'JOVENS10', discount: 20, subtotal: 200, total: 180 }),
		});
		const { service } = buildService(coupons);

		await service.checkout(TEST_USER_ID, { ...cart, couponCode: 'jovens10' }, logger);

		expect(coupons.validate).toHaveBeenCalledWith({ code: 'jovens10', eventId: TEST_EVENT_ID, subtotal: 200 });
	});

	it('records which coupon the buyer used, so the organizer can audit it', async () => {
		const coupons = partialMock<CouponApplier>({
			validate: vi.fn().mockResolvedValue({ code: 'JOVENS10', discount: 20, subtotal: 200, total: 180 }),
		});
		const { registrations, service } = buildService(coupons);

		await service.checkout(TEST_USER_ID, { ...cart, couponCode: 'jovens10' }, logger);

		expect(registrations[0].additional_info).toMatchObject({ coupon_code: 'JOVENS10', coupon_discount: 20 });
	});

	it('lets a refused coupon stop the purchase instead of charging full price silently', async () => {
		const coupons = partialMock<CouponApplier>({
			validate: vi.fn().mockRejectedValue(new Error('expirado')),
		});
		const { registrations, service } = buildService(coupons);

		await expect(service.checkout(TEST_USER_ID, { ...cart, couponCode: 'venceu' }, logger)).rejects.toThrow();
		expect(registrations).toHaveLength(0);
	});

	it.each([
		{ error: new CouponNotFound(), status: 404, code: 'COUPON_NOT_FOUND' },
		{ error: new CouponNotStarted(), status: 422, code: 'COUPON_NOT_STARTED' },
		{ error: new CouponExpired(), status: 422, code: 'COUPON_EXPIRED' },
		{ error: new CouponExhausted(), status: 422, code: 'COUPON_EXHAUSTED' },
	])('answers $code instead of an internal error when the coupon is refused', async ({ error, status, code }) => {
		const coupons = partialMock<CouponApplier>({ validate: vi.fn().mockRejectedValue(error) });
		const { service } = buildService(coupons);

		await expect(service.checkout(TEST_USER_ID, { ...cart, couponCode: 'x' }, logger)).rejects.toMatchObject({
			statusCode: status,
			code,
		});
	});
});
