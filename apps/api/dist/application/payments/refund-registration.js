import { ApiError } from '../../shared/errors.js';
/**
 * Reembolso de uma inscrição pelo organizador.
 *
 * O provedor só estorna integralmente e confirma pelo webhook `*.refunded`,
 * que é quem marca a inscrição como reembolsada. Aqui só se pede o estorno do
 * recurso certo (checkout hospedado ou cada parcela PIX paga) e se registra o
 * pedido; no modo simulado, sem webhook, o registro é liquidado na hora.
 */
export class RefundRegistration {
    gateway;
    repository;
    constructor(gateway, repository) {
        this.gateway = gateway;
        this.repository = repository;
    }
    async execute(registration, reason) {
        if (registration.payment_provider !== this.gateway.provider)
            throw unavailable();
        const refunds = [];
        if (registration.is_installment_payment) {
            const charges = await this.repository.listPaidInstallmentCharges(registration.id);
            if (charges.length === 0)
                throw unavailable();
            for (const charge of charges) {
                const refund = await this.gateway.refundPixCharge(charge.chargeId, reason);
                refunds.push({ amount: charge.amount, providerId: charge.chargeId, refundId: refund.refundId });
            }
        }
        else {
            if (registration.payment_status !== 'paid' || !registration.provider_transaction_id)
                throw unavailable();
            const refund = await this.gateway.refundCheckout(registration.provider_transaction_id, reason);
            refunds.push({
                amount: Number(registration.total_amount ?? 0),
                providerId: registration.provider_transaction_id,
                refundId: refund.refundId,
            });
        }
        const settledLocally = this.gateway.provider === 'mock';
        for (const refund of refunds) {
            await this.repository.recordTransaction({
                registration_id: registration.id,
                provider: this.gateway.provider,
                provider_event_id: `refund.requested:${refund.providerId}:${registration.id}`,
                provider_object_id: refund.providerId,
                event_type: 'refund.requested',
                amount: refund.amount,
                provider_fee: 0,
                platform_fee: 0,
                organizer_net: 0,
                status: settledLocally ? 'refunded' : 'pending',
                metadata: { reason, refund_id: refund.refundId },
            });
        }
        if (settledLocally)
            await this.repository.updateRegistration(registration.id, { payment_status: 'refunded' });
        return { refundIds: refunds.map((refund) => refund.refundId) };
    }
}
function unavailable() {
    return new ApiError('Esta inscrição não tem pagamento reembolsável no provedor.', 409, 'REFUND_UNAVAILABLE');
}
//# sourceMappingURL=refund-registration.js.map