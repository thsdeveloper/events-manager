import type { PaymentCheckoutStatus, PaymentGateway } from './payment-gateway.js';

export interface CheckoutReconciliationCandidate {
	checkoutId: string;
	registrationIds: string[];
}

export interface CheckoutReconciliationRepository {
	claimPending(input: { before: string; batchSize: number }): Promise<CheckoutReconciliationCandidate[]>;
	settlePaid(candidate: CheckoutReconciliationCandidate): Promise<void>;
	cancel(
		candidate: CheckoutReconciliationCandidate,
		providerStatus: 'EXPIRED' | 'CANCELLED' | 'REFUNDED',
	): Promise<void>;
}

export interface CheckoutReconciliationResult {
	claimed: number;
	paid: number;
	pending: number;
	cancelled: number;
	failed: Array<{ checkoutId: string; reason: string }>;
}

const cancellationStatuses = new Set<PaymentCheckoutStatus>(['EXPIRED', 'CANCELLED', 'REFUNDED']);

export class ReconcileCheckouts {
	constructor(
		private readonly gateway: PaymentGateway,
		private readonly repository: CheckoutReconciliationRepository,
	) {}

	async execute(input: { before: Date; batchSize: number }): Promise<CheckoutReconciliationResult> {
		const candidates = await this.repository.claimPending({
			before: input.before.toISOString(),
			batchSize: input.batchSize,
		});
		const result: CheckoutReconciliationResult = {
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
				} else if (cancellationStatuses.has(checkout.status)) {
					await this.repository.cancel(candidate, checkout.status as 'EXPIRED' | 'CANCELLED' | 'REFUNDED');
					result.cancelled += 1;
				} else {
					result.pending += 1;
				}
			} catch (error) {
				result.failed.push({
					checkoutId: candidate.checkoutId,
					reason: error instanceof Error ? error.message : 'Unknown reconciliation error',
				});
			}
		}

		return result;
	}
}
