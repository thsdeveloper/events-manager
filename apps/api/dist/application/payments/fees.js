const roundMoney = (value) => Math.round(value * 100) / 100;
export function calculatePlatformFee(baseAmount, configuration) {
    if (baseAmount <= 0)
        return 0;
    return roundMoney(baseAmount * (Number(configuration.platform_fee_percentage) / 100));
}
export function calculateProviderFee(paidAmount, method, configuration, installments = 1) {
    if (paidAmount <= 0 || method === 'free')
        return 0;
    if (method === 'pix')
        return roundMoney(Number(configuration.pix_fee_fixed));
    if (method === 'boleto')
        return roundMoney(Number(configuration.boleto_fee_fixed));
    const percentage = installments >= 7
        ? Number(configuration.card_installment_7_12_percentage)
        : installments >= 2
            ? Number(configuration.card_installment_2_6_percentage)
            : Number(configuration.card_fee_percentage);
    return roundMoney(paidAmount * (percentage / 100) + Number(configuration.card_fee_fixed));
}
export function calculateOrganizerNet(baseAmount, buyerPaidAmount, platformFee, providerFee) {
    const platformFeeAlreadyPaidByBuyer = buyerPaidAmount > baseAmount;
    const platformCost = platformFeeAlreadyPaidByBuyer ? 0 : platformFee;
    return roundMoney(Math.max(0, baseAmount - platformCost - providerFee));
}
//# sourceMappingURL=fees.js.map