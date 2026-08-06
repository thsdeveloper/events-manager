export class InstallmentPlanUnavailable extends Error {
    constructor() {
        super('Installment plan unavailable');
        this.name = 'InstallmentPlanUnavailable';
    }
}
export function buildInstallmentAmounts(total, installments, minimumTotal = 0) {
    const totalInCents = Math.round(total * 100);
    const minimumInCents = Math.round(minimumTotal * 100);
    if (!Number.isInteger(installments) ||
        installments < 2 ||
        installments > 12 ||
        totalInCents < minimumInCents ||
        totalInCents < installments) {
        throw new InstallmentPlanUnavailable();
    }
    const baseInCents = Math.floor(totalInCents / installments);
    const remainder = totalInCents - baseInCents * installments;
    return Array.from({ length: installments }, (_, index) => (index === installments - 1 ? baseInCents + remainder : baseInCents) / 100);
}
//# sourceMappingURL=installment-plan.js.map