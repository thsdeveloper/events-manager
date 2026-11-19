/**
 * Ingressos nominais no checkout.
 *
 * O pedido (`event_registrations`) guarda quem pagou; cada unidade comprada
 * vira um ingresso próprio, com código, participante e valor rateado. Estes
 * testes exercitam o `PaymentService.checkout` com repositório e gateway
 * falsos e verificam o que é emitido por unidade.
 */
import { describe, expect, it, vi } from 'vitest';
import type { Database } from '@events-manager/contracts';
import { splitAmount } from '../src/application/payments/checkout-plan.js';
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

type TicketInsert = Database['public']['Tables']['registration_tickets']['Insert'];

const TICKET_ID = '00000000-0000-4000-8000-000000000060';

const configuration = {
	platform_fee_percentage: 10,
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
			service_fee_type: 'passed_to_buyer',
			min_quantity_per_purchase: 1,
			max_quantity_per_purchase: 10,
			sale_start_date: null,
			sale_end_date: null,
		},
	],
} as unknown as CheckoutEvent;

function buildService(options: { coupons?: CouponApplier } = {}) {
	const tickets: TicketInsert[] = [];
	const registrations: Database['public']['Tables']['event_registrations']['Insert'][] = [];
	const repository = partialMock<PaymentRepository>({
		findCheckoutEvent: vi.fn().mockResolvedValue(event),
		getConfiguration: vi.fn().mockResolvedValue(configuration),
		createRegistration: vi.fn(async (input) => {
			registrations.push(input);

			return { ...input, id: `r-${registrations.length}` };
		}),
		createRegistrationTickets: vi.fn(async (rows: TicketInsert[]) => {
			tickets.push(...rows);

			return rows.map((row, index) => ({ ...row, id: `t-${index + 1}` }));
		}),
		recordTransaction: vi.fn().mockResolvedValue(undefined),
	});
	// Modo simulado: a compra confirma na hora e nada sai para o provedor.
	const gateway = partialMock<PaymentGateway>({ provider: 'mock' });
	const service = new PaymentService(
		repository,
		gateway,
		partialMock<ManageTicketInventory>({ reserve: vi.fn().mockResolvedValue(undefined) }),
		partialMock<GetCheckoutStatus>({}),
		partialMock<EnforceRateLimit>({ execute: vi.fn().mockResolvedValue(undefined) }),
		'https://events.local',
		() => new Date('2026-09-17T12:00:00.000Z'),
		options.coupons,
	);

	return { registrations, repository, service, tickets, gateway };
}

const logger = { error: () => {} };
const buyer = { name: 'Ana', email: 'Ana@events.local', document: '39053344705' };

describe('PaymentService.checkout: ingressos por unidade', () => {
	it('preserves pending nomination and a different attendee in Pix installments', async () => {
		const { service, repository, gateway, tickets, registrations } = buildService();
		Object.assign(repository, {
			findTicketForInstallments: vi.fn().mockResolvedValue({
				...event.tickets[0],
				allow_pix_installments: true,
				max_pix_installments: 3,
				event_id: { ...event, status: 'published' },
			}),
			createInstallments: vi.fn(async (rows) =>
				rows.map((row: object, index: number) => ({ ...row, id: `i-${index}` })),
			),
			setInstallmentCharge: vi.fn().mockResolvedValue(undefined),
		});
		Object.assign(gateway, {
			createPixCharge: vi
				.fn()
				.mockResolvedValue({ id: 'pix-1', qrCodeBase64: 'QR', copyPasteCode: 'PIX', expiresAt: null }),
		});
		await service.createInstallmentCheckout(
			TEST_USER_ID,
			{
				ticket_id: TICKET_ID,
				quantity: 2,
				installments: 2,
				participant_name: buyer.name,
				participant_email: buyer.email,
				attendees: [null, { name: 'Bia', email: 'bia@events.local' }],
			},
			logger,
		);
		expect(registrations[0]).toMatchObject({ participant_name: buyer.name, participant_email: buyer.email });
		expect(tickets[0]).toMatchObject({ attendee_name: null, attendee_email: null, named_at: null, is_buyer: false });
		expect(tickets[1]).toMatchObject({ attendee_name: 'Bia', attendee_email: 'bia@events.local', is_buyer: false });
	});

	it('issues one ticket per unit and hands the first to the buyer when nobody was named', async () => {
		const { service, tickets } = buildService();

		await service.checkout(
			TEST_USER_ID,
			{ eventId: TEST_EVENT_ID, participantInfo: buyer, tickets: [{ ticketId: TICKET_ID, quantity: 3 }] },
			logger,
		);

		expect(tickets).toHaveLength(3);
		expect(tickets.map((ticket) => ticket.sequence)).toEqual([1, 2, 3]);
		expect(tickets[0]).toMatchObject({
			attendee_name: 'Ana',
			attendee_email: 'Ana@events.local',
			attendee_document: '39053344705',
			is_buyer: true,
			registration_id: 'r-1',
			event_id: TEST_EVENT_ID,
			ticket_type_id: TICKET_ID,
		});
		expect(tickets[1]).toMatchObject({ attendee_name: null, attendee_email: null, is_buyer: false });
		expect(new Set(tickets.map((ticket) => ticket.ticket_code)).size).toBe(3);
	});

	it('places each named attendee on its unit and recognizes the buyer by e-mail', async () => {
		const { service, tickets } = buildService();

		await service.checkout(
			TEST_USER_ID,
			{
				eventId: TEST_EVENT_ID,
				participantInfo: buyer,
				tickets: [
					{
						ticketId: TICKET_ID,
						quantity: 3,
						attendees: [
							null,
							{ name: 'Bia', email: 'bia@events.local' },
							{ name: 'Ana Souza', email: 'ana@events.local' },
						],
					},
				],
			},
			logger,
		);

		expect(tickets[0]).toMatchObject({ attendee_name: null, is_buyer: false, named_at: null });
		expect(tickets[1]).toMatchObject({ attendee_name: 'Bia', attendee_email: 'bia@events.local', is_buyer: false });
		expect(tickets[2]).toMatchObject({ attendee_name: 'Ana Souza', is_buyer: true });
		expect(tickets[1].named_at).toBe('2026-09-17T12:00:00.000Z');
	});

	it('prorates price, fee and coupon per unit so the sum still matches the order', async () => {
		const coupons = partialMock<CouponApplier>({
			validate: vi.fn().mockResolvedValue({ code: 'DEZ', discount: 10, subtotal: 330, total: 320 }),
		});
		const { registrations, service, tickets } = buildService({ coupons });

		await service.checkout(
			TEST_USER_ID,
			{
				eventId: TEST_EVENT_ID,
				couponCode: 'DEZ',
				participantInfo: buyer,
				tickets: [{ ticketId: TICKET_ID, quantity: 3 }],
			},
			logger,
		);

		const sum = (field: 'discount' | 'service_fee' | 'total_amount') =>
			Math.round(tickets.reduce((total, ticket) => total + Number(ticket[field] ?? 0), 0) * 100) / 100;
		expect(tickets.map((ticket) => ticket.unit_price)).toEqual([100, 100, 100]);
		expect(sum('service_fee')).toBe(30);
		expect(sum('discount')).toBe(10);
		expect(sum('total_amount')).toBe(Number(registrations[0].total_amount));
		expect(tickets.map((ticket) => ticket.discount)).toEqual([3.33, 3.33, 3.34]);
	});

	it('keeps the order code equal to the first ticket code, for receipts already sent', async () => {
		const { registrations, service, tickets } = buildService();

		await service.checkout(
			TEST_USER_ID,
			{ eventId: TEST_EVENT_ID, participantInfo: buyer, tickets: [{ ticketId: TICKET_ID, quantity: 2 }] },
			logger,
		);

		expect(registrations[0].ticket_code).toBe(tickets[0].ticket_code);
	});
});

describe('splitAmount', () => {
	it('splits to the cent and gives the remainder to the last unit', () => {
		expect(splitAmount(10, 3)).toEqual([3.33, 3.33, 3.34]);
		expect(splitAmount(0, 2)).toEqual([0, 0]);
		expect(splitAmount(100, 1)).toEqual([100]);
	});
});
