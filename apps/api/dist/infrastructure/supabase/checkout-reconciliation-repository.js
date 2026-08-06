export class SupabaseCheckoutReconciliationRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async claimPending(input) {
        const { data, error } = await this.database.rpc('claim_pending_checkout_reconciliations', {
            target_before: input.before,
            target_batch_size: input.batchSize,
        });
        if (error)
            throw error;
        return (data ?? []).map((row) => ({
            checkoutId: row.checkout_id,
            registrationIds: row.registration_ids,
        }));
    }
    async settlePaid(candidate) {
        const { error } = await this.database.rpc('settle_reconciled_checkout', {
            target_checkout_id: candidate.checkoutId,
            target_registrations: candidate.registrationIds,
        });
        if (error)
            throw error;
    }
    async cancel(candidate, providerStatus) {
        const { error } = await this.database.rpc('cancel_reconciled_checkout', {
            target_checkout_id: candidate.checkoutId,
            target_registrations: candidate.registrationIds,
            target_provider_status: providerStatus,
        });
        if (error)
            throw error;
    }
}
//# sourceMappingURL=checkout-reconciliation-repository.js.map