/**
 * Confirmação da compra sem depender do webhook.
 *
 * O webhook do provedor só chega a um endereço público em HTTPS; a reconciliação
 * periódica só olha checkouts com mais de alguns minutos. Quando a pessoa volta
 * do provedor e a inscrição ainda está pendente, a própria consulta de status
 * pergunta ao provedor e liquida na hora, guardando o comprovante.
 */
import { describe, expect, it, vi } from 'vitest';
import { GetCheckoutStatus, type CheckoutStatusRepository } from '../src/application/payments/get-checkout-status.js';
import type { CheckoutReconciliationRepository } from '../src/application/payments/reconcile-checkouts.js';
import type { PaymentGateway } from '../src/application/payments/payment-gateway.js';
import { partialMock } from './support/index.js';

const REGISTRATION_ID = '00000000-0000-4000-8000-000000000020';
const GROUP_ID = '00000000-0000-4000-8000-000000000040';
const RECEIPT = 'https://app.abacatepay.com/receipt/tran_1';

const pending = {
	id: REGISTRATION_ID,
	status: 'pending',
	paymentStatus: 'pending',
	totalAmount: 100,
	ticketCode: 'EVT-123',
	receiptUrl: null,
	providerCheckoutId: 'bill_1',
	event: { id: '00000000-0000-4000-8000-000000000030', title: 'Evento', slug: 'evento' },
};
const paid = { ...pending, status: 'confirmed', paymentStatus: 'paid', receiptUrl: RECEIPT };

function build(
	providerStatus: 'PAID' | 'PENDING' | 'EXPIRED' = 'PAID',
	provider: 'abacatepay' | 'mock' = 'abacatepay',
) {
	const repository: CheckoutStatusRepository = {
		findByUser: vi
			.fn()
			.mockResolvedValueOnce([pending])
			.mockResolvedValueOnce([providerStatus === 'PAID' ? paid : pending]),
	};
	const reconciliation = partialMock<CheckoutReconciliationRepository>({
		settlePaid: vi.fn().mockResolvedValue(undefined),
		cancel: vi.fn().mockResolvedValue(undefined),
	});
	const gateway = partialMock<PaymentGateway>({
		provider,
		getCheckout: vi.fn().mockResolvedValue({
			id: 'bill_1',
			externalId: GROUP_ID,
			status: providerStatus,
			amountInCents: 10000,
			paidAmountInCents: providerStatus === 'PAID' ? 10000 : null,
			receiptUrl: providerStatus === 'PAID' ? RECEIPT : null,
		}),
	});
	const useCase = new GetCheckoutStatus(repository, { gateway, reconciliation });

	return { gateway, reconciliation, repository, useCase };
}

describe('GetCheckoutStatus com consulta ao provedor', () => {
	it('settles a pending hosted checkout the provider already reports as paid, keeping the receipt', async () => {
		const { gateway, reconciliation, useCase } = build('PAID');

		const result = await useCase.execute('user-1', { checkoutGroupId: GROUP_ID });

		expect(gateway.getCheckout).toHaveBeenCalledWith('bill_1');
		expect(reconciliation.settlePaid).toHaveBeenCalledWith(
			{ checkoutId: 'bill_1', registrationIds: [REGISTRATION_ID] },
			RECEIPT,
		);
		expect(result.status).toBe('confirmed');
		expect(result.registrations[0].receiptUrl).toBe(RECEIPT);
	});

	it('releases the seats when the provider says the checkout expired', async () => {
		const { reconciliation, useCase } = build('EXPIRED');

		await useCase.execute('user-1', { checkoutGroupId: GROUP_ID });

		expect(reconciliation.cancel).toHaveBeenCalledWith(
			{ checkoutId: 'bill_1', registrationIds: [REGISTRATION_ID] },
			'EXPIRED',
		);
	});

	it('leaves a still pending checkout alone', async () => {
		const { reconciliation, useCase } = build('PENDING');

		const result = await useCase.execute('user-1', { checkoutGroupId: GROUP_ID });

		expect(reconciliation.settlePaid).not.toHaveBeenCalled();
		expect(reconciliation.cancel).not.toHaveBeenCalled();
		expect(result.status).toBe('pending');
	});

	it('never asks the mock provider, which has no remote state', async () => {
		const { gateway, useCase } = build('PAID', 'mock');

		await useCase.execute('user-1', { checkoutGroupId: GROUP_ID });

		expect(gateway.getCheckout).not.toHaveBeenCalled();
	});

	it('still answers with the stored status when the provider is unreachable', async () => {
		const { gateway, useCase } = build('PAID');
		(gateway.getCheckout as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('timeout'));

		await expect(useCase.execute('user-1', { checkoutGroupId: GROUP_ID })).resolves.toMatchObject({
			status: 'pending',
		});
	});

	it('does not expose the provider checkout id in the public contract', async () => {
		const { useCase } = build('PENDING');

		const result = await useCase.execute('user-1', { checkoutGroupId: GROUP_ID });

		expect(result.registrations[0]).not.toHaveProperty('providerCheckoutId');
	});
});
