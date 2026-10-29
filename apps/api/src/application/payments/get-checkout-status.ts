import { checkoutStatusSchema, type CheckoutStatus } from '@events-manager/contracts';
import type { PaymentGateway } from './payment-gateway.js';
import type { CheckoutReconciliationRepository } from './reconcile-checkouts.js';
import type { TicketDelivery } from '../tickets/deliver-tickets.js';

export type CheckoutLocator =
	| { checkoutGroupId: string; registrationId?: never }
	| { checkoutGroupId?: never; registrationId: string };

/** Linha lida do banco: o contrato público mais o id do checkout no provedor. */
export type StoredCheckoutRegistration = CheckoutStatus['registrations'][number] & {
	providerCheckoutId?: string | null;
};

export interface CheckoutStatusRepository {
	findByUser(userId: string, locator: CheckoutLocator): Promise<StoredCheckoutRegistration[]>;
}

export interface CheckoutStatusProvider {
	gateway: PaymentGateway;
	reconciliation: Pick<CheckoutReconciliationRepository, 'cancel' | 'settlePaid'>;
}

export class CheckoutNotFound extends Error {
	constructor() {
		super('Checkout not found');
		this.name = 'CheckoutNotFound';
	}
}

export function summarizeCheckoutStatus(registrations: CheckoutStatus['registrations']): CheckoutStatus['status'] {
	const confirmed = registrations.filter((registration) =>
		['free', 'paid'].includes(registration.paymentStatus ?? ''),
	).length;
	const cancelled = registrations.filter(
		(registration) => registration.status === 'cancelled' || registration.paymentStatus === 'refunded',
	).length;

	if (confirmed === registrations.length) return 'confirmed';
	if (cancelled === registrations.length) return 'cancelled';
	if (confirmed > 0 || cancelled > 0) return 'attention';
	return 'pending';
}

export class GetCheckoutStatus {
	constructor(
		private readonly repository: CheckoutStatusRepository,
		private readonly provider?: CheckoutStatusProvider,
		private readonly ticketDelivery?: TicketDelivery,
	) {}

	async execute(userId: string, locator: CheckoutLocator): Promise<CheckoutStatus> {
		let registrations = await this.repository.findByUser(userId, locator);
		if (!registrations.length) throw new CheckoutNotFound();

		if (await this.syncPendingWithProvider(registrations)) {
			registrations = await this.repository.findByUser(userId, locator);
		}

		return checkoutStatusSchema.parse({
			registrations,
			status: summarizeCheckoutStatus(registrations),
		});
	}

	/**
	 * O webhook só chega a um endereço público e a reconciliação periódica só
	 * olha checkouts antigos. Quando a pessoa volta do provedor com a inscrição
	 * ainda pendente, perguntamos ao provedor na hora; uma falha na consulta não
	 * derruba a página, que segue mostrando o estado guardado.
	 */
	private async syncPendingWithProvider(registrations: StoredCheckoutRegistration[]) {
		if (!this.provider || this.provider.gateway.provider === 'mock') return false;
		const pendingByCheckout = new Map<string, string[]>();
		for (const registration of registrations) {
			if (registration.paymentStatus !== 'pending' || !registration.providerCheckoutId) continue;
			const ids = pendingByCheckout.get(registration.providerCheckoutId) ?? [];
			pendingByCheckout.set(registration.providerCheckoutId, [...ids, registration.id]);
		}

		let changed = false;
		for (const [checkoutId, registrationIds] of pendingByCheckout) {
			try {
				const checkout = await this.provider.gateway.getCheckout(checkoutId);
				if (checkout.status === 'PAID') {
					await this.provider.reconciliation.settlePaid({ checkoutId, registrationIds }, checkout.receiptUrl ?? null);
					changed = true;
					await this.ticketDelivery?.execute(registrationIds).catch(() => undefined);
				} else if (checkout.status === 'EXPIRED' || checkout.status === 'CANCELLED' || checkout.status === 'REFUNDED') {
					await this.provider.reconciliation.cancel({ checkoutId, registrationIds }, checkout.status);
					changed = true;
				}
			} catch {
				// Provedor fora do ar ou lento: o estado guardado continua valendo.
			}
		}
		return changed;
	}
}
