/**
 * Checkout hospedado no AbacatePay.
 *
 * O que chega ao gateway decide quanto a pessoa paga e por qual meio. Estes
 * testes exercitam o `PaymentService` com um gateway falso no lugar do
 * AbacatePay e verificam o pedido montado, não a resposta do provedor.
 */
import { describe, expect, it, vi } from 'vitest';
import type { Database } from '@events-manager/contracts';
import {
	PaymentService,
	type CheckoutEvent,
	type CouponApplier,
	type PaymentRepository,
} from '../src/application/payments/payment-service.js';
import type { CheckoutMethod, PaymentGateway } from '../src/application/payments/payment-gateway.js';
import type { EnforceRateLimit } from '../src/application/security/rate-limit.js';
import type { GetCheckoutStatus } from '../src/application/payments/get-checkout-status.js';
import type { ManageTicketInventory } from '../src/application/payments/manage-ticket-inventory.js';
import { partialMock, TEST_EVENT_ID, TEST_USER_ID } from './support/index.js';

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

const event = {
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

function buildService(
	options: { coupons?: CouponApplier; methods?: CheckoutMethod[]; provider?: 'abacatepay' | 'mock' } = {},
) {
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
		findProviderProduct: vi.fn().mockResolvedValue(null),
		saveProviderProduct: vi.fn().mockResolvedValue(undefined),
		linkCheckout: vi.fn().mockResolvedValue(undefined),
		cancelIncompleteCheckout: vi.fn().mockResolvedValue(undefined),
		recordTransaction: vi.fn(),
	});
	const gateway = partialMock<PaymentGateway>({
		provider: options.provider ?? 'abacatepay',
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
		partialMock<ManageTicketInventory>({ reserve: vi.fn().mockResolvedValue(undefined) }),
		partialMock<GetCheckoutStatus>({}),
		partialMock<EnforceRateLimit>({ execute: vi.fn().mockResolvedValue(undefined) }),
		'https://events.local',
		() => new Date('2026-09-15T12:00:00.000Z'),
		options.coupons,
		options.methods,
	);

	return { gateway, registrations, repository, service };
}

const logger = { error: () => {} };
const cart = {
	eventId: TEST_EVENT_ID,
	participantInfo: { name: 'Ana', email: 'ana@events.local' },
	tickets: [{ ticketId: TICKET_ID, quantity: 1 }],
};

describe('PaymentService.checkout hospedado: métodos de pagamento', () => {
	it('offers only PIX unless the store is configured otherwise', async () => {
		const { gateway, service } = buildService();

		await service.checkout(TEST_USER_ID, cart, logger);

		expect(gateway.createCheckout).toHaveBeenCalledWith(expect.objectContaining({ methods: ['PIX'] }));
	});

	it('accepts card as a choice once the store has it enabled', async () => {
		const { gateway, service } = buildService({ methods: ['PIX', 'CARD'] });

		await service.checkout(TEST_USER_ID, { ...cart, paymentMethod: 'CARD' }, logger);

		expect(gateway.createCheckout).toHaveBeenCalledWith(expect.objectContaining({ methods: ['CARD'] }));
	});
});

/**
 * O checkout hospedado cobra o preço do produto cadastrado no AbacatePay, não o
 * total calculado aqui. O produto reutilizado precisa ser o do preço unitário
 * desta compra: preço editado ou cupom aplicado não podem herdar um produto antigo.
 */
describe('PaymentService.checkout hospedado: produto do provedor', () => {
	it('reuses the provider product cached for this ticket at this unit price', async () => {
		const { gateway, repository, service } = buildService();
		(repository.findProviderProduct as ReturnType<typeof vi.fn>).mockResolvedValue('prod_cached');

		await service.checkout(TEST_USER_ID, cart, logger);

		expect(repository.findProviderProduct).toHaveBeenCalledWith(TICKET_ID, 10000);
		expect(gateway.createProduct).not.toHaveBeenCalled();
		expect(gateway.createCheckout).toHaveBeenCalledWith(
			expect.objectContaining({ items: [{ productId: 'prod_cached', quantity: 1 }] }),
		);
	});

	it('creates and caches a product for the unit price when none matches', async () => {
		const { gateway, repository, service } = buildService();

		await service.checkout(TEST_USER_ID, cart, logger);

		expect(gateway.createProduct).toHaveBeenCalledWith(
			expect.objectContaining({ priceInCents: 10000, externalId: expect.stringMatching(`^${TICKET_ID}:10000:`) }),
		);
		expect(repository.saveProviderProduct).toHaveBeenCalledWith(TICKET_ID, 10000, expect.stringMatching(/^prod_/));
	});

	it('looks up the product by the discounted unit price when a coupon applies', async () => {
		const coupons = partialMock<CouponApplier>({
			validate: vi.fn().mockResolvedValue({ code: 'JOVENS10', discount: 10, subtotal: 100, total: 90 }),
		});
		const { gateway, repository, service } = buildService({ coupons });

		await service.checkout(TEST_USER_ID, { ...cart, couponCode: 'JOVENS10' }, logger);

		expect(repository.findProviderProduct).toHaveBeenCalledWith(TICKET_ID, 9000);
		expect(gateway.createProduct).toHaveBeenCalledWith(expect.objectContaining({ priceInCents: 9000 }));
	});

	it('never reuses an external id, because the provider rejects duplicates after a cache loss', async () => {
		const { gateway, service } = buildService();

		await service.checkout(TEST_USER_ID, cart, logger);
		await service.checkout(TEST_USER_ID, cart, logger);

		const externalIds = (gateway.createProduct as ReturnType<typeof vi.fn>).mock.calls.map(
			([input]) => input.externalId,
		);
		expect(new Set(externalIds).size).toBe(2);
	});
});

/**
 * O AbacatePay deduplica clientes por CPF e usa o `customerId` para chegar na
 * página hospedada com nome, e-mail e documento preenchidos. A pessoa já digitou
 * tudo isso aqui; não faz sentido pedir de novo lá.
 */
describe('PaymentService.checkout hospedado: cliente pré-preenchido', () => {
	it('registers the buyer at the provider and links the checkout to that customer', async () => {
		const { gateway, service } = buildService();

		await service.checkout(
			TEST_USER_ID,
			{
				...cart,
				participantInfo: {
					name: 'Ana',
					email: 'ana@events.local',
					document: '390.533.447-05',
					phone: '(11) 99999-9999',
				},
			},
			logger,
		);

		expect(gateway.createCustomer).toHaveBeenCalledWith({
			name: 'Ana',
			email: 'ana@events.local',
			taxId: '390.533.447-05',
			cellphone: '(11) 99999-9999',
		});
		expect(gateway.createCheckout).toHaveBeenCalledWith(expect.objectContaining({ customerId: 'cust_1' }));
	});

	it('keeps selling when the provider refuses the customer, leaving the page to ask the buyer', async () => {
		const { gateway, service } = buildService();
		(gateway.createCustomer as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Invalid taxId'));

		await expect(service.checkout(TEST_USER_ID, cart, logger)).resolves.toMatchObject({
			checkoutId: expect.any(String),
		});
		expect(gateway.createCheckout).toHaveBeenCalledWith(expect.not.objectContaining({ customerId: expect.anything() }));
	});
});

/**
 * A pessoa escolhe Pix ou cartão na tela; o checkout hospedado recebe só o
 * método escolhido. Pedir um método que a loja não aceita derruba o checkout
 * inteiro no provedor, então a escolha é validada contra a configuração antes.
 */
describe('PaymentService.checkout hospedado: método escolhido', () => {
	const cardTicket = {
		...event,
		tickets: [
			{ ...(event as unknown as { tickets: object[] }).tickets[0], allow_installments: true, max_installments: 6 },
		],
	} as unknown as CheckoutEvent;

	it('sends only the chosen method to the provider', async () => {
		const { gateway, service } = buildService({ methods: ['PIX', 'CARD'] });

		await service.checkout(TEST_USER_ID, { ...cart, paymentMethod: 'CARD' }, logger);

		expect(gateway.createCheckout).toHaveBeenCalledWith(expect.objectContaining({ methods: ['CARD'] }));
	});

	it('lets the card page offer the installments the ticket allows', async () => {
		const { gateway, repository, service } = buildService({ methods: ['PIX', 'CARD'] });
		(repository.findCheckoutEvent as ReturnType<typeof vi.fn>).mockResolvedValue(cardTicket);

		await service.checkout(TEST_USER_ID, { ...cart, paymentMethod: 'CARD' }, logger);

		expect(gateway.createCheckout).toHaveBeenCalledWith(expect.objectContaining({ cardMaxInstallments: 6 }));
	});

	it('keeps Pix as the default when the buyer chose nothing', async () => {
		const { gateway, service } = buildService({ methods: ['PIX', 'CARD'] });

		await service.checkout(TEST_USER_ID, cart, logger);

		expect(gateway.createCheckout).toHaveBeenCalledWith(expect.objectContaining({ methods: ['PIX'] }));
		expect(gateway.createCheckout).toHaveBeenCalledWith(
			expect.not.objectContaining({ cardMaxInstallments: expect.any(Number) }),
		);
	});

	it('refuses a method the store does not accept before touching the provider', async () => {
		const { gateway, registrations, service } = buildService({ methods: ['PIX'] });

		await expect(service.checkout(TEST_USER_ID, { ...cart, paymentMethod: 'CARD' }, logger)).rejects.toMatchObject({
			statusCode: 422,
			code: 'PAYMENT_METHOD_UNAVAILABLE',
		});
		expect(gateway.createCheckout).not.toHaveBeenCalled();
		expect(registrations).toHaveLength(0);
	});

	it('accepts card in mock mode regardless of the store configuration, recording the method chosen', async () => {
		const { registrations, service } = buildService({ methods: ['PIX'], provider: 'mock' });

		await service.checkout(TEST_USER_ID, { ...cart, paymentMethod: 'CARD' }, logger);

		expect(registrations[0]).toMatchObject({ payment_method: 'card', payment_status: 'paid' });
	});
});

describe('minimum unit fee snapshots', () => {
	it('uses the same per-unit minimum for provider products and stored orders', async () => {
		const { service, repository, registrations } = buildService();
		vi.mocked(repository.getConfiguration).mockResolvedValue({
			...configuration,
			platform_fee_percentage: 5,
			platform_fee_minimum: 3,
		} as never);
		vi.mocked(repository.findCheckoutEvent).mockResolvedValue({
			...event,
			tickets: [{ ...event.tickets[0], price: 10, service_fee_type: 'passed_to_buyer' }],
		});
		await service.checkout(TEST_USER_ID, { ...cart, tickets: [{ ticketId: TICKET_ID, quantity: 2 }] }, logger);
		expect(registrations[0]).toMatchObject({ unit_price: 10, total_amount: 26, platform_fee: 6, service_fee: 6 });
		expect(repository.findProviderProduct).toHaveBeenCalledWith(TICKET_ID, 1300);
	});
});

describe('installment current pricing', () => {
	it('refuses an absorbed ticket below the new minimum with a validation error before creating a payment', async () => {
		const { service, repository } = buildService();
		Object.assign(repository, {
			findTicketForInstallments: vi.fn().mockResolvedValue({
				...event.tickets[0],
				price: 2,
				buyer_price: 2,
				allow_installments: true,
				max_installments: 3,
				event_id: {
					id: TEST_EVENT_ID,
					title: 'Evento',
					status: 'published',
					registration_start: null,
					registration_end: null,
				},
			}),
		});
		vi.mocked(repository.getConfiguration).mockResolvedValue({ ...configuration, platform_fee_minimum: 3 } as never);
		await expect(
			service.createInstallmentCheckout(
				TEST_USER_ID,
				{
					ticket_id: TICKET_ID,
					quantity: 1,
					installments: 2,
					participant_name: 'Ana',
					participant_email: 'ana@example.com',
				},
				logger,
			),
		).rejects.toMatchObject({ statusCode: 422, code: 'TICKET_PRICE_BELOW_FEE' });
		expect(repository.createRegistration).not.toHaveBeenCalled();
	});
	it('uses the current per-unit minimum for installment amounts and records immutable fee snapshots', async () => {
		const { service, repository, registrations, gateway } = buildService();
		Object.assign(repository, {
			findTicketForInstallments: vi.fn().mockResolvedValue({
				...event.tickets[0],
				price: 10,
				buyer_price: 10.5,
				service_fee_type: 'passed_to_buyer',
				allow_installments: true,
				max_installments: 3,
				event_id: {
					id: TEST_EVENT_ID,
					title: 'Evento',
					status: 'published',
					registration_start: null,
					registration_end: null,
				},
			}),
			createInstallments: vi.fn(async (rows: Array<Record<string, unknown>>) =>
				rows.map((row, index) => ({ ...row, id: 'i-' + index })),
			),
			setInstallmentCharge: vi.fn().mockResolvedValue(undefined),
		});
		Object.assign(gateway, {
			createPixCharge: vi.fn().mockResolvedValue({
				id: 'pix-1',
				qrCodeBase64: 'QR',
				copyPasteCode: 'PIX',
				expiresAt: '2026-12-01T12:00:00Z',
			}),
		});
		vi.mocked(repository.getConfiguration).mockResolvedValue({
			...configuration,
			platform_fee_percentage: 5,
			platform_fee_minimum: 3,
		} as never);
		const result = await service.createInstallmentCheckout(
			TEST_USER_ID,
			{
				ticket_id: TICKET_ID,
				quantity: 2,
				installments: 2,
				participant_name: 'Ana',
				participant_email: 'ana@example.com',
			},
			logger,
		);
		expect(result.total_amount).toBe(26);
		expect(registrations[0]).toMatchObject({ total_amount: 26, platform_fee: 6, service_fee: 6 });
		expect(repository.createInstallments).toHaveBeenCalledWith([
			expect.objectContaining({ amount: 13 }),
			expect.objectContaining({ amount: 13 }),
		]);
	});
});

describe('project discounted fee snapshots', () => {
	it.each([
		{ discount: 26, total: 0, fee: 0 },
		{ discount: 24, total: 2, fee: 2 },
	])('stores fees limited to the actual discounted line total: $total', async ({ discount, total, fee }) => {
		const coupons = partialMock<CouponApplier>({
			validate: vi.fn().mockResolvedValue({ code: 'PROMO', discount, subtotal: 26, total }),
		});
		const { service, repository, registrations } = buildService({ coupons });
		vi.mocked(repository.getConfiguration).mockResolvedValue({
			...configuration,
			platform_fee_percentage: 5,
			platform_fee_minimum: 3,
		} as never);
		vi.mocked(repository.findCheckoutEvent).mockResolvedValue({
			...event,
			tickets: [{ ...event.tickets[0], price: 10, service_fee_type: 'passed_to_buyer' }],
		});
		await service.checkout(
			TEST_USER_ID,
			{ ...cart, couponCode: 'PROMO', tickets: [{ ticketId: TICKET_ID, quantity: 2 }] },
			logger,
		);
		expect(registrations[0]).toMatchObject({
			unit_price: 10,
			total_amount: total,
			platform_fee: fee,
			service_fee: fee,
		});
	});
});
