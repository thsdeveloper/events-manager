import type { Database } from '@events-manager/contracts';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
	CheckoutReconciliationCandidate,
	CheckoutReconciliationRepository,
} from '../../application/payments/reconcile-checkouts.js';

export class SupabaseCheckoutReconciliationRepository implements CheckoutReconciliationRepository {
	constructor(private readonly database: SupabaseClient<Database>) {}

	async claimPending(input: { before: string; batchSize: number }) {
		const { data, error } = await this.database.rpc('claim_pending_checkout_reconciliations', {
			target_before: input.before,
			target_batch_size: input.batchSize,
		});
		if (error) throw error;
		return (data ?? []).map((row): CheckoutReconciliationCandidate => ({
			checkoutId: row.checkout_id,
			registrationIds: row.registration_ids,
		}));
	}

	async settlePaid(candidate: CheckoutReconciliationCandidate) {
		const { error } = await this.database.rpc('settle_reconciled_checkout', {
			target_checkout_id: candidate.checkoutId,
			target_registrations: candidate.registrationIds,
		});
		if (error) throw error;
	}

	async cancel(candidate: CheckoutReconciliationCandidate, providerStatus: 'EXPIRED' | 'CANCELLED' | 'REFUNDED') {
		const { error } = await this.database.rpc('cancel_reconciled_checkout', {
			target_checkout_id: candidate.checkoutId,
			target_registrations: candidate.registrationIds,
			target_provider_status: providerStatus,
		});
		if (error) throw error;
	}
}
