import { expect, it, vi } from 'vitest';
import { PaymentService, type PaymentRepository } from '../src/application/payments/payment-service.js';
import type { PaymentGateway } from '../src/application/payments/payment-gateway.js';
import type { EnforceRateLimit } from '../src/application/security/rate-limit.js';
import type { ManageTicketInventory } from '../src/application/payments/manage-ticket-inventory.js';
import type { GetCheckoutStatus } from '../src/application/payments/get-checkout-status.js';
import { partialMock } from './support/index.js';
const installment = {
	id: 'i',
	amount: 50,
	status: 'pending',
	provider_transaction_id: 'pix1',
	pix_copy_paste: 'COPY',
	pix_qr_code_base64: 'QR',
	registration_id: {
		id: 'r',
		user_id: 'u',
		status: 'partial_payment',
		payment_status: 'pending',
		event_id: { title: 'Evento' },
	},
};
function setup(testMode = false, found: unknown = installment) {
	const repository = partialMock<PaymentRepository>({
		findInstallmentForUser: vi.fn().mockResolvedValue(found),
		setInstallmentCharge: vi.fn(),
		settleReconciledInstallment: vi.fn().mockResolvedValue(undefined),
	});
	const gateway = partialMock<PaymentGateway>({
		provider: 'abacatepay',
		getPixCharge: vi.fn().mockResolvedValue({ id: 'pix1', status: 'PENDING', expiresAt: '2099-01-01T10:00:00Z' }),
		createPixCharge: vi
			.fn()
			.mockResolvedValue({ id: 'new', qrCodeBase64: 'NEW', copyPasteCode: 'NEW', expiresAt: null }),
		simulateTransparentPixPayment: vi.fn().mockResolvedValue(undefined),
	});
	const service = new PaymentService(
		repository,
		gateway,
		partialMock<ManageTicketInventory>({}),
		partialMock<GetCheckoutStatus>({}),
		partialMock<EnforceRateLimit>({ execute: vi.fn() }),
		'http://localhost',
		undefined,
		undefined,
		['PIX'],
		undefined,
		testMode,
	);
	return { service, repository, gateway };
}
it('reuses the still-payable installment Pix instead of abandoning its charge', async () => {
	const { service, gateway } = setup();
	const response = await service.generateInstallmentPix('u', 'i');
	expect(response.payment.pix_copy_paste).toBe('COPY');
	expect(gateway.createPixCharge).not.toHaveBeenCalled();
});
it('refuses to generate a charge for a cancelled purchase', async () => {
	const { service, gateway } = setup(false, {
		...installment,
		registration_id: { ...installment.registration_id, status: 'cancelled' },
	});
	await expect(service.generateInstallmentPix('u', 'i')).rejects.toMatchObject({ code: 'INSTALLMENT_NOT_PAYABLE' });
	expect(gateway.createPixCharge).not.toHaveBeenCalled();
});
it('never permits simulation in production', async () => {
	const { service, gateway } = setup(false);
	await expect(service.simulateInstallmentPayment('u', 'i')).rejects.toMatchObject({ statusCode: 403 });
	expect(gateway.simulateTransparentPixPayment).not.toHaveBeenCalled();
});
it('simulates only an owned installment and waits for the gateway to report payment', async () => {
	const { service, gateway, repository } = setup(true);
	vi.mocked(gateway.getPixCharge).mockResolvedValue({ id: 'pix1', status: 'PAID', expiresAt: null });
	await service.simulateInstallmentPayment('u', 'i');
	expect(repository.findInstallmentForUser).toHaveBeenCalledWith('i', 'u');
	expect(gateway.simulateTransparentPixPayment).toHaveBeenCalledWith('pix1');
	expect(repository.settleReconciledInstallment).toHaveBeenCalledWith({
		chargeId: 'pix1',
		installmentId: 'i',
		registrationId: 'r',
	});
});
it('does not settle while the provider still reports pending', async () => {
	const { service, repository } = setup(true);
	await expect(service.simulateInstallmentPayment('u', 'i')).rejects.toMatchObject({ statusCode: 409 });
	expect(repository.settleReconciledInstallment).not.toHaveBeenCalled();
});
it('hides an installment owned by another user', async () => {
	const { service } = setup(true, null);
	await expect(service.simulateInstallmentPayment('u', 'i')).rejects.toMatchObject({ statusCode: 404 });
});
