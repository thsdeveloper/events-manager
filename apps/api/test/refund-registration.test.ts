/**
 * Reembolso de uma inscrição pelo organizador.
 *
 * O provedor só estorna integralmente e confirma pelo webhook `*.refunded`. O
 * caso de uso pede o estorno do recurso certo (checkout hospedado ou cada
 * parcela PIX paga), registra o pedido e deixa a confirmação para o webhook.
 */
import { describe, expect, it, vi } from 'vitest';
import { RefundRegistration, type RefundRepository } from '../src/application/payments/refund-registration.js';
import type { PaymentGateway } from '../src/application/payments/payment-gateway.js';
import { partialMock } from './support/index.js';

const paidCheckout = {
	id: 'registration-1',
	payment_provider: 'abacatepay',
	payment_status: 'paid',
	provider_transaction_id: 'bill_1',
	is_installment_payment: false,
	total_amount: 362.25,
};

function build(provider: 'abacatepay' | 'mock' = 'abacatepay') {
	const repository = partialMock<RefundRepository>({
		listPaidInstallmentCharges: vi.fn().mockResolvedValue([]),
		recordTransaction: vi.fn().mockResolvedValue(undefined),
		updateRegistration: vi.fn().mockResolvedValue(undefined),
	});
	const gateway = partialMock<PaymentGateway>({
		provider,
		refundCheckout: vi.fn().mockResolvedValue({ refundId: 'tran_refund_1' }),
		refundPixCharge: vi.fn(async (id: string) => ({ refundId: `tran_refund_${id}` })),
	});
	return { gateway, repository, useCase: new RefundRegistration(gateway, repository) };
}

describe('RefundRegistration', () => {
	it('asks the provider to refund the hosted checkout and records the request as pending', async () => {
		const { gateway, repository, useCase } = build();

		const result = await useCase.execute(paidCheckout, 'Evento cancelado');

		expect(gateway.refundCheckout).toHaveBeenCalledWith('bill_1', 'Evento cancelado');
		expect(result).toEqual({ refundIds: ['tran_refund_1'] });
		expect(repository.recordTransaction).toHaveBeenCalledWith(
			expect.objectContaining({
				registration_id: 'registration-1',
				provider_event_id: 'refund.requested:bill_1:registration-1',
				event_type: 'refund.requested',
				status: 'pending',
				amount: 362.25,
			}),
		);
		expect(repository.updateRegistration).not.toHaveBeenCalled();
	});

	it('refunds every paid PIX installment of an installment plan', async () => {
		const { gateway, repository, useCase } = build();
		(repository.listPaidInstallmentCharges as ReturnType<typeof vi.fn>).mockResolvedValue([
			{ chargeId: 'pix_char_1', amount: 120.75 },
			{ chargeId: 'pix_char_2', amount: 120.75 },
		]);

		const result = await useCase.execute(
			{ ...paidCheckout, is_installment_payment: true, provider_transaction_id: null, payment_status: 'pending' },
			'Evento cancelado',
		);

		expect(gateway.refundPixCharge).toHaveBeenCalledTimes(2);
		expect(gateway.refundCheckout).not.toHaveBeenCalled();
		expect(result).toEqual({ refundIds: ['tran_refund_pix_char_1', 'tran_refund_pix_char_2'] });
	});

	it('refuses when nothing was paid through the provider', async () => {
		const { useCase } = build();

		await expect(useCase.execute({ ...paidCheckout, payment_status: 'pending' }, 'x')).rejects.toMatchObject({
			statusCode: 409,
			code: 'REFUND_UNAVAILABLE',
		});
	});

	it('settles the refund locally in mock mode, where no webhook will ever arrive', async () => {
		const { repository, useCase } = build('mock');

		await useCase.execute({ ...paidCheckout, payment_provider: 'mock', provider_transaction_id: 'mock_1' }, 'x');

		expect(repository.updateRegistration).toHaveBeenCalledWith('registration-1', { payment_status: 'refunded' });
		expect(repository.recordTransaction).toHaveBeenCalledWith(expect.objectContaining({ status: 'refunded' }));
	});
});
it('refunds transparent purchases through the transparent endpoint and awaits provider confirmation', async () => {
	const { gateway, repository, useCase } = build();
	await useCase.execute(
		{ ...paidCheckout, provider_transaction_id: 'card_1', additional_info: { payment_flow: 'transparent' } },
		'Solicitado pelo comprador',
	);
	expect(gateway.refundPixCharge).toHaveBeenCalledWith('card_1', 'Solicitado pelo comprador');
	expect(gateway.refundCheckout).not.toHaveBeenCalled();
	expect(repository.updateRegistration).not.toHaveBeenCalled();
});
