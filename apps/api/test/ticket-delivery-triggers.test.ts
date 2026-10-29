/**
 * Quando os ingressos saem por e-mail. O dinheiro entra por três caminhos
 * (webhook, consulta de status na volta do provedor e reconciliação periódica)
 * e o modo simulado confirma na hora. Todos precisam pedir a entrega; a
 * idempotência dos e-mails garante que ninguém recebe duas vezes.
 */
import { describe, expect, it, vi } from 'vitest';
import { GetCheckoutStatus, type CheckoutStatusRepository } from '../src/application/payments/get-checkout-status.js';
import {
	PaymentService,
	type CheckoutEvent,
	type PaymentRepository,
	type RegistrationRow,
} from '../src/application/payments/payment-service.js';
import type { PaymentGateway } from '../src/application/payments/payment-gateway.js';
import {
	ReconcileCheckouts,
	type CheckoutReconciliationRepository,
} from '../src/application/payments/reconcile-checkouts.js';
import type { EnforceRateLimit } from '../src/application/security/rate-limit.js';
import type { ManageTicketInventory } from '../src/application/payments/manage-ticket-inventory.js';
import type { TicketDelivery } from '../src/application/tickets/deliver-tickets.js';
import { partialMock, TEST_EVENT_ID, TEST_USER_ID } from './support/index.js';

const TICKET_ID = '00000000-0000-4000-8000-000000000060';
const logger = { error: () => {} };

function delivery() {
	return partialMock<TicketDelivery>({ execute: vi.fn().mockResolvedValue({}) });
}

describe('entrega dos ingressos: gatilhos', () => {
	it('delivers right after a simulated purchase, which confirms on the spot', async () => {
		const tickets = delivery();
		const repository = partialMock<PaymentRepository>({
			findCheckoutEvent: vi.fn().mockResolvedValue({
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
					},
				],
			} as unknown as CheckoutEvent),
			getConfiguration: vi.fn().mockResolvedValue({ platform_fee_percentage: 0 }),
			createRegistration: vi.fn(async (input) => ({ ...input, id: 'r-1' })),
			createRegistrationTickets: vi.fn(async (rows) => rows),
			recordTransaction: vi.fn().mockResolvedValue(undefined),
		});
		const service = new PaymentService(
			repository,
			partialMock<PaymentGateway>({ provider: 'mock' }),
			partialMock<ManageTicketInventory>({ reserve: vi.fn().mockResolvedValue(undefined) }),
			partialMock<GetCheckoutStatus>({}),
			partialMock<EnforceRateLimit>({ execute: vi.fn().mockResolvedValue(undefined) }),
			'https://events.local',
			undefined,
			undefined,
			['PIX'],
			tickets,
		);

		await service.checkout(
			TEST_USER_ID,
			{
				eventId: TEST_EVENT_ID,
				participantInfo: { name: 'Ana', email: 'ana@events.local' },
				tickets: [{ ticketId: TICKET_ID, quantity: 1 }],
			},
			logger,
		);

		expect(tickets.execute).toHaveBeenCalledWith(['r-1']);
	});

	it('delivers when the provider webhook completes the checkout, and still answers 2xx if e-mail fails', async () => {
		const tickets = delivery();
		vi.mocked(tickets.execute).mockRejectedValue(new Error('smtp down'));
		const registration = {
			id: 'r-1',
			total_amount: 100,
			payment_amount: 100,
			platform_fee: 0,
			payment_status: 'pending',
		} as unknown as RegistrationRow;
		const repository = partialMock<PaymentRepository>({
			findCheckoutRegistrations: vi.fn().mockResolvedValue([registration]),
			updateRegistration: vi.fn().mockResolvedValue(undefined),
			recordTransaction: vi.fn().mockResolvedValue(undefined),
			hasProcessedWebhook: vi.fn().mockResolvedValue(false),
			markWebhookProcessed: vi.fn().mockResolvedValue(undefined),
		});
		const service = new PaymentService(
			repository,
			partialMock<PaymentGateway>({ provider: 'abacatepay' }),
			partialMock<ManageTicketInventory>({ reserve: vi.fn().mockResolvedValue(undefined) }),
			partialMock<GetCheckoutStatus>({}),
			partialMock<EnforceRateLimit>({}),
			'https://events.local',
			undefined,
			undefined,
			['PIX'],
			tickets,
		);

		const result = await service.processWebhook({
			id: 'log_1',
			event: 'checkout.completed',
			data: { checkout: { id: 'bill_1', externalId: 'group-1', paidAmount: 10000 } },
		});

		expect(result).toEqual({ received: true });
		expect(tickets.execute).toHaveBeenCalledWith(['r-1']);
	});

	it('delivers when the status check settles a paid checkout when the buyer returns from the provider', async () => {
		const tickets = delivery();
		const pending = {
			id: '00000000-0000-4000-8000-000000000020',
			status: 'pending',
			paymentStatus: 'pending',
			totalAmount: 100,
			ticketCode: 'EVT-123',
			receiptUrl: null,
			providerCheckoutId: 'bill_1',
			tickets: [],
			event: { id: '00000000-0000-4000-8000-000000000030', title: 'Evento', slug: 'evento' },
		};
		const repository: CheckoutStatusRepository = {
			findByUser: vi
				.fn()
				.mockResolvedValueOnce([pending])
				.mockResolvedValueOnce([{ ...pending, status: 'confirmed', paymentStatus: 'paid' }]),
		};
		const useCase = new GetCheckoutStatus(
			repository,
			{
				gateway: partialMock<PaymentGateway>({
					provider: 'abacatepay',
					getCheckout: vi.fn().mockResolvedValue({ id: 'bill_1', status: 'PAID', receiptUrl: null }),
				}),
				reconciliation: partialMock<CheckoutReconciliationRepository>({
					settlePaid: vi.fn().mockResolvedValue(undefined),
				}),
			},
			tickets,
		);

		await useCase.execute('user-1', { registrationId: pending.id });

		expect(tickets.execute).toHaveBeenCalledWith([pending.id]);
	});

	it('delivers when the periodic reconciliation finds the checkout paid', async () => {
		const tickets = delivery();
		const repository: CheckoutReconciliationRepository = {
			claimPending: vi.fn().mockResolvedValue([{ checkoutId: 'bill_1', registrationIds: ['r-1', 'r-2'] }]),
			settlePaid: vi.fn().mockResolvedValue(undefined),
			cancel: vi.fn().mockResolvedValue(undefined),
		};
		const gateway = partialMock<PaymentGateway>({
			getCheckout: vi.fn().mockResolvedValue({ id: 'bill_1', status: 'PAID', receiptUrl: null }),
		});

		await new ReconcileCheckouts(gateway, repository, tickets).execute({ before: new Date(), batchSize: 10 });

		expect(tickets.execute).toHaveBeenCalledWith(['r-1', 'r-2']);
	});
});
