export class SupabaseInstallmentReconciliationRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async claimPending(input) {
        const { data, error } = await this.database.rpc('claim_pending_installment_reconciliations', {
            target_before: input.before,
            target_batch_size: input.batchSize,
        });
        if (error)
            throw error;
        return (data ?? []).map((row) => ({
            chargeId: row.charge_id,
            installmentId: row.installment_id,
            registrationId: row.registration_id,
        }));
    }
    async settlePaid(candidate) {
        const { error } = await this.database.rpc('settle_reconciled_installment', {
            target_charge_id: candidate.chargeId,
            target_installment_id: candidate.installmentId,
            target_registration_id: candidate.registrationId,
        });
        if (error)
            throw error;
    }
    async cancel(candidate, providerStatus) {
        const { error } = await this.database.rpc('cancel_reconciled_installment', {
            target_charge_id: candidate.chargeId,
            target_installment_id: candidate.installmentId,
            target_registration_id: candidate.registrationId,
            target_provider_status: providerStatus,
        });
        if (error)
            throw error;
    }
}
//# sourceMappingURL=installment-reconciliation-repository.js.map