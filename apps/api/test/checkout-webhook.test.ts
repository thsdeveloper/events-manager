/**
 * Webhook `checkout.*` do AbacatePay.
 *
 * O webhook é a única confirmação de que o dinheiro entrou. Estes testes
 * exercitam o `PaymentService.processWebhook` com um repositório falso e
 * verificam o que é confirmado, o que é registrado e o que é recusado.
 */
import { describe, expect, it, vi } from 'vitest';
import {
	PaymentService,
	type PaymentRepository,
	type PaymentWebhookPayload,
	type RegistrationRow,
} from '../src/application/payments/payment-service.js';
import type { PaymentGateway } from '../src/application/payments/payment-gateway.js';
import type { EnforceRateLimit } from '../src/application/security/rate-limit.js';
import type { GetCheckoutStatus } from '../src/application/payments/get-checkout-status.js';
import type { ManageTicketInventory } from '../src/application/payments/manage-ticket-inventory.js';
import { partialMock } from './support/index.js';

const registration = {
	id: 'registration-1',
	total_amount: 362.25,
	payment_amount: 345,
	platform_fee: 17.25,
	payment_status: 'pending',
} as unknown as RegistrationRow;

function buildService(registrations: RegistrationRow[] = [registration]) {
	const repository = partialMock<PaymentRepository>({
		findCheckoutRegistrations: vi.fn().mockResolvedValue(registrations),
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
		() => new Date('2026-09-15T12:00:00.000Z'),
	);

	return { repository, service };
}

function completed(checkout: Record<string, unknown>): PaymentWebhookPayload {
	return {
		id: 'log_1',
		event: 'checkout.completed',
		data: {
			checkout: { id: 'bill_1', externalId: 'group-1', amount: 36225, platformFee: 80, methods: ['PIX'], ...checkout },
			payerInformation: { method: 'PIX' },
		},
	};
}

describe('PaymentService.processWebhook: valor pago', () => {
	it('confirms the registration when the provider reports the full amount paid', async () => {
		const { repository, service } = buildService();

		await service.processWebhook(completed({ paidAmount: 36225 }));

		expect(repository.updateRegistration).toHaveBeenCalledWith(
			'registration-1',
			expect.objectContaining({ status: 'confirmed', payment_status: 'paid' }),
		);
	});

	it('keeps the provider receipt on the registration when the checkout completes', async () => {
		const { repository, service } = buildService();

		await service.processWebhook(
			completed({ paidAmount: 36225, receiptUrl: 'https://app.abacatepay.com/receipt/tran_1' }),
		);

		expect(repository.updateRegistration).toHaveBeenCalledWith(
			'registration-1',
			expect.objectContaining({ receipt_url: 'https://app.abacatepay.com/receipt/tran_1' }),
		);
	});

	it('still confirms when the provider omits paidAmount, as older payloads did', async () => {
		const { repository, service } = buildService();

		await service.processWebhook(completed({}));

		expect(repository.updateRegistration).toHaveBeenCalledWith(
			'registration-1',
			expect.objectContaining({ status: 'confirmed' }),
		);
	});

	it('refuses to confirm when the amount paid is below the registrations total', async () => {
		const { repository, service } = buildService();

		const result = await service.processWebhook(completed({ paidAmount: 30000 }));

		expect(result).toEqual({ received: true, ignored: 'amount_mismatch' });
		expect(repository.updateRegistration).not.toHaveBeenCalled();
		expect(repository.recordTransaction).toHaveBeenCalledWith(
			expect.objectContaining({
				event_type: 'checkout.completed',
				status: 'pending',
				registration_id: 'registration-1',
			}),
		);
	});

	it('tolerates the cent lost when a unit price is split across a quantity', async () => {
		// 3 unidades a R$ 33,33 = R$ 99,99 no provedor; a inscrição guarda R$ 100,00.
		const { repository, service } = buildService([
			{ ...registration, total_amount: 100, quantity: 3 } as unknown as RegistrationRow,
		]);

		await service.processWebhook(completed({ amount: 9999, paidAmount: 9999 }));

		expect(repository.updateRegistration).toHaveBeenCalledWith(
			'registration-1',
			expect.objectContaining({ status: 'confirmed' }),
		);
	});
});

/**
 * O provedor reenvia o webhook com backoff enquanto não recebe 2xx, e a doc
 * pede para guardar o `id` de cada evento (`log_…`) e processar uma vez só.
 */
describe('PaymentService.processWebhook: entrega repetida', () => {
	it('acknowledges a webhook already processed without touching the registration again', async () => {
		const { repository, service } = buildService();
		(repository.hasProcessedWebhook as ReturnType<typeof vi.fn>).mockResolvedValue(true);

		const result = await service.processWebhook(completed({ paidAmount: 36225 }));

		expect(result).toEqual({ received: true, duplicate: true });
		expect(repository.hasProcessedWebhook).toHaveBeenCalledWith('log_1');
		expect(repository.updateRegistration).not.toHaveBeenCalled();
	});

	it('remembers the event id only after the whole event was processed', async () => {
		const { repository, service } = buildService();

		await service.processWebhook(completed({ paidAmount: 36225 }));

		expect(repository.markWebhookProcessed).toHaveBeenCalledWith('log_1', 'checkout.completed');
		const order = (repository.updateRegistration as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
		expect((repository.markWebhookProcessed as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0]).toBeGreaterThan(
			order,
		);
	});

	it('processes a payload without an event id, as the mock and older deliveries send', async () => {
		const { repository, service } = buildService();
		const payload = completed({ paidAmount: 36225 });
		delete payload.id;

		await service.processWebhook(payload);

		expect(repository.hasProcessedWebhook).not.toHaveBeenCalled();
		expect(repository.updateRegistration).toHaveBeenCalled();
	});
});
