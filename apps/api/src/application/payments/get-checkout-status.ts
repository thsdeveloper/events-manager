import { checkoutStatusSchema, type CheckoutStatus } from '@events-manager/contracts';

export type CheckoutLocator =
	{ checkoutGroupId: string; registrationId?: never } | { checkoutGroupId?: never; registrationId: string };

export interface CheckoutStatusRepository {
	findByUser(userId: string, locator: CheckoutLocator): Promise<CheckoutStatus['registrations']>;
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
	constructor(private readonly repository: CheckoutStatusRepository) {}

	async execute(userId: string, locator: CheckoutLocator): Promise<CheckoutStatus> {
		const registrations = await this.repository.findByUser(userId, locator);
		if (!registrations.length) throw new CheckoutNotFound();

		return checkoutStatusSchema.parse({
			registrations,
			status: summarizeCheckoutStatus(registrations),
		});
	}
}
