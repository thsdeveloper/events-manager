const cancellationStatuses = new Set(['EXPIRED', 'CANCELLED', 'REFUNDED']);
export class ReconcileCheckouts {
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
                const checkout = await this.gateway.getCheckout(candidate.checkoutId);
                if (checkout.status === 'PAID') {
                    await this.repository.settlePaid(candidate);
                    result.paid += 1;
                }
                else if (cancellationStatuses.has(checkout.status)) {
                    await this.repository.cancel(candidate, checkout.status);
                    result.cancelled += 1;
                }
                else {
                    result.pending += 1;
                }
            }
            catch (error) {
                result.failed.push({
                    checkoutId: candidate.checkoutId,
                    reason: error instanceof Error ? error.message : 'Unknown reconciliation error',
                });
            }
        }
        return result;
    }
}
//# sourceMappingURL=reconcile-checkouts.js.map