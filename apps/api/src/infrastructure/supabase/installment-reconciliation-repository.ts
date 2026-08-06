import type { Database } from '@events-manager/contracts';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
	InstallmentChargeReconciliationCandidate,
	InstallmentChargeReconciliationRepository,
} from '../../application/payments/reconcile-installment-charges.js';

export class SupabaseInstallmentReconciliationRepository implements InstallmentChargeReconciliationRepository {
	constructor(private readonly database: SupabaseClient<Database>) {}

	async claimPending(input: { before: string; batchSize: number }) {
		const { data, error } = await this.database.rpc('claim_pending_installment_reconciliations', {
			target_before: input.before,
			target_batch_size: input.batchSize,
		});
		if (error) throw error;
		return (data ?? []).map((row): InstallmentChargeReconciliationCandidate => ({
			chargeId: row.charge_id,
			installmentId: row.installment_id,
			registrationId: row.registration_id,
		}));
	}

	async settlePaid(candidate: InstallmentChargeReconciliationCandidate) {
		const { error } = await this.database.rpc('settle_reconciled_installment', {
			target_charge_id: candidate.chargeId,
			target_installment_id: candidate.installmentId,
			target_registration_id: candidate.registrationId,
		});
		if (error) throw error;
	}

	async cancel(candidate: InstallmentChargeReconciliationCandidate, providerStatus: 'EXPIRED' | 'CANCELLED') {
		const { error } = await this.database.rpc('cancel_reconciled_installment', {
			target_charge_id: candidate.chargeId,
			target_installment_id: candidate.installmentId,
			target_registration_id: candidate.registrationId,
			target_provider_status: providerStatus,
		});
		if (error) throw error;
	}
}
