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
    provider;
    constructor(repository, provider) {
        this.repository = repository;
        this.provider = provider;
    }
    async execute(userId, locator) {
        let registrations = await this.repository.findByUser(userId, locator);
        if (!registrations.length)
            throw new CheckoutNotFound();
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
    async syncPendingWithProvider(registrations) {
        if (!this.provider || this.provider.gateway.provider === 'mock')
            return false;
        const pendingByCheckout = new Map();
        for (const registration of registrations) {
            if (registration.paymentStatus !== 'pending' || !registration.providerCheckoutId)
                continue;
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
                }
                else if (checkout.status === 'EXPIRED' || checkout.status === 'CANCELLED' || checkout.status === 'REFUNDED') {
                    await this.provider.reconciliation.cancel({ checkoutId, registrationIds }, checkout.status);
                    changed = true;
                }
            }
            catch {
                // Provedor fora do ar ou lento: o estado guardado continua valendo.
            }
        }
        return changed;
    }
}
//# sourceMappingURL=get-checkout-status.js.map