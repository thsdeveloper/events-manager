import { vi } from 'vitest';
import type { Database } from '@events-manager/contracts';
import {
	PaymentService,
	type CheckoutEvent,
	type CouponApplier,
	type PaymentRepository,
} from '../../src/application/payments/payment-service.js';
import type { CheckoutMethod, PaymentGateway } from '../../src/application/payments/payment-gateway.js';
import type { EnforceRateLimit } from '../../src/application/security/rate-limit.js';
import type { GetCheckoutStatus } from '../../src/application/payments/get-checkout-status.js';
import type { ManageTicketInventory } from '../../src/application/payments/manage-ticket-inventory.js';
import { partialMock, TEST_EVENT_ID, TEST_USER_ID } from './index.js';

const TICKET_ID = '00000000-0000-4000-8000-000000000060';

const configuration = {
	platform_fee_percentage: 0,
	pix_fee_fixed: 0,
	card_fee_percentage: 0,
	card_fee_fixed: 0,
	card_installment_2_6_percentage: 0,
	card_installment_7_12_percentage: 0,
	boleto_fee_fixed: 0,
};

export const event = {
	organizer_id: { accepted_payment_methods: ['PIX', 'CARD', 'BOLETO'], credit_card_settlement_period: 'D+1' },
	id: TEST_EVENT_ID,
	slug: 'congresso',
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

export function buildService(
	options: {
		coupons?: CouponApplier;
		methods?: CheckoutMethod[];
		provider?: 'abacatepay' | 'mock';
		testMode?: boolean;
	} = {},
) {
	const registrations: Database['public']['Tables']['event_registrations']['Insert'][] = [];
	const repository = partialMock<PaymentRepository>({
		isOrganizerApprovedForEvent: vi.fn().mockResolvedValue(true),
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
		findProviderProduct: vi.fn().mockResolvedValue(null),
		saveProviderProduct: vi.fn().mockResolvedValue(undefined),
		linkCheckout: vi.fn().mockResolvedValue(undefined),
		cancelIncompleteCheckout: vi.fn().mockResolvedValue(undefined),
		recordTransaction: vi.fn(),
	});
	const gateway = partialMock<PaymentGateway>({
		provider: options.provider ?? 'abacatepay',
		createTransparentCharge: vi.fn(async (input) => ({
			id: 'pix_charge',
			method: input.method,
			status: 'PENDING',
			amountInCents: input.amountInCents,
			providerFeeInCents: 80,
			devMode: true,
			metadata: input.metadata,
			copyPasteCode: 'pix-code',
			qrCodeBase64: null,
			barcode: null,
			boletoUrl: null,
			expiresAt: null,
			receiptUrl: null,
		})),
		createProduct: vi.fn(async (input) => ({ id: `prod_${input.externalId}`, externalId: input.externalId })),
		createCustomer: vi.fn(async () => ({ id: 'cust_1' })),
		createCheckout: vi.fn(async (input) => ({
			id: `bill_${input.externalId}`,
			url: 'https://app.abacatepay.com/pay/bill_1',
			amountInCents: 0,
		})),
	});

	const service = new PaymentService(
		repository,
		gateway,
		partialMock<ManageTicketInventory>({
			reserve: vi.fn().mockResolvedValue(undefined),
			release: vi.fn().mockResolvedValue(undefined),
		}),
		partialMock<GetCheckoutStatus>({}),
		partialMock<EnforceRateLimit>({ execute: vi.fn().mockResolvedValue(undefined) }),
		'https://events.local',
		() => new Date('2026-09-15T12:00:00.000Z'),
		options.coupons,
		options.methods,
		undefined,
		options.testMode,
	);

	return { gateway, registrations, repository, service };
}

export const cart = {
	eventId: TEST_EVENT_ID,
	participantInfo: { name: 'Ana', email: 'ana@events.local' },
	tickets: [{ ticketId: TICKET_ID, quantity: 1 }],
};
