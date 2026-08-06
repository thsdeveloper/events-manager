export class ReconcileInstallmentCharges {
    gateway;
    repository;
    constructor(gateway, repository) {
        this.gateway = gateway;
        this.repository = repository;
    }
    async execute(input) {
        const candidates = await this.repository.claimPending({
            before: input.before.toISOString(),
            batchSize: input.batchSize,
        });
        const result = {
            claimed: candidates.length,
            paid: 0,
            pending: 0,
            cancelled: 0,
            failed: [],
        };
        for (const candidate of candidates) {
            try {
                const charge = await this.gateway.getPixCharge(candidate.chargeId);
                if (charge.status === 'PAID') {
                    await this.repository.settlePaid(candidate);
                    result.paid += 1;
                }
                else if (charge.status === 'EXPIRED' || charge.status === 'CANCELLED') {
                    await this.repository.cancel(candidate, charge.status);
                    result.cancelled += 1;
                }
                else {
                    result.pending += 1;
                }
            }
            catch (error) {
                result.failed.push({
                    chargeId: candidate.chargeId,
                    reason: error instanceof Error ? error.message : 'Unknown reconciliation error',
                });
            }
        }
        return result;
    }
}
//# sourceMappingURL=reconcile-installment-charges.js.map