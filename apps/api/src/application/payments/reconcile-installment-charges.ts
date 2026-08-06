import type { PaymentGateway } from './payment-gateway.js';

export interface InstallmentChargeReconciliationCandidate {
	chargeId: string;
	installmentId: string;
	registrationId: string;
}

export interface InstallmentChargeReconciliationRepository {
	claimPending(input: { before: string; batchSize: number }): Promise<InstallmentChargeReconciliationCandidate[]>;
	settlePaid(candidate: InstallmentChargeReconciliationCandidate): Promise<void>;
	cancel(candidate: InstallmentChargeReconciliationCandidate, providerStatus: 'EXPIRED' | 'CANCELLED'): Promise<void>;
}

export class ReconcileInstallmentCharges {
	constructor(
		private readonly gateway: PaymentGateway,
		private readonly repository: InstallmentChargeReconciliationRepository,
	) {}

	async execute(input: { before: Date; batchSize: number }) {
		const candidates = await this.repository.claimPending({
			before: input.before.toISOString(),
			batchSize: input.batchSize,
		});
		const result = {
			claimed: candidates.length,
			paid: 0,
			pending: 0,
			cancelled: 0,
			failed: [] as Array<{ chargeId: string; reason: string }>,
		};

		for (const candidate of candidates) {
			try {
				const charge = await this.gateway.getPixCharge(candidate.chargeId);
				if (charge.status === 'PAID') {
					await this.repository.settlePaid(candidate);
					result.paid += 1;
				} else if (charge.status === 'EXPIRED' || charge.status === 'CANCELLED') {
					await this.repository.cancel(candidate, charge.status);
					result.cancelled += 1;
				} else {
					result.pending += 1;
				}
			} catch (error) {
				result.failed.push({
					chargeId: candidate.chargeId,
					reason: error instanceof Error ? error.message : 'Unknown reconciliation error',
				});
			}
		}

		return result;
	}
}
