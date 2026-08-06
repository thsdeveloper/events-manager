import { checkoutStatusSchema } from '@events-manager/contracts';
export class CheckoutNotFound extends Error {
    constructor() {
        super('Checkout not found');
        this.name = 'CheckoutNotFound';
    }
}
export function summarizeCheckoutStatus(registrations) {
    const confirmed = registrations.filter((registration) => ['free', 'paid'].includes(registration.paymentStatus ?? '')).length;
    const cancelled = registrations.filter((registration) => registration.status === 'cancelled' || registration.paymentStatus === 'refunded').length;
    if (confirmed === registrations.length)
        return 'confirmed';
    if (cancelled === registrations.length)
        return 'cancelled';
    if (confirmed > 0 || cancelled > 0)
        return 'attention';
    return 'pending';
}
export class GetCheckoutStatus {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async execute(userId, locator) {
        const registrations = await this.repository.findByUser(userId, locator);
        if (!registrations.length)
            throw new CheckoutNotFound();
        return checkoutStatusSchema.parse({
            registrations,
            status: summarizeCheckoutStatus(registrations),
        });
    }
}
//# sourceMappingURL=get-checkout-status.js.map