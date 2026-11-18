import {
	calculateUnitPlatformFee,
	readGatewayFees,
	quoteGatewayFee,
	type CardSettlementPeriod,
	type GatewayFees,
	type GatewayFeeMethod,
} from '@events-manager/contracts';
export interface PaymentFeeConfiguration
	extends Partial<Omit<GatewayFees, 'card_rates' | 'pix_fee_fixed' | 'card_fee_fixed' | 'boleto_fee_fixed'>> {
	card_rates?: unknown;
	platform_fee_percentage: number | string;
	platform_fee_minimum?: number | string | null;
	pix_fee_fixed: number | string;
	card_fee_percentage: number | string;
	card_fee_fixed: number | string;
	card_installment_2_6_percentage: number | string;
	card_installment_7_12_percentage: number | string;
	boleto_fee_fixed: number | string;
}

export type PaymentMethod = GatewayFeeMethod;

const roundMoney = (value: number) => Math.round(value * 100) / 100;

export function calculatePlatformFee(baseAmount: number, configuration: PaymentFeeConfiguration) {
	if (baseAmount <= 0) return 0;
	return calculateUnitPlatformFee(baseAmount, {
		platform_fee_percentage: Number(configuration.platform_fee_percentage),
		platform_fee_minimum: Number(configuration.platform_fee_minimum ?? 0),
	});
}

export function calculateProviderFee(
	paidAmount: number,
	method: PaymentMethod,
	configuration: PaymentFeeConfiguration,
	installments = 1,
	period: CardSettlementPeriod = 'D+1',
) {
	if (paidAmount <= 0 || method === 'free') return 0;
	if (configuration.card_rates || method === 'debit' || method === 'boleto_pix')
		return quoteGatewayFee(paidAmount, method, readGatewayFees({ ...configuration }), installments, period).fee;
	if (method === 'pix') return roundMoney(Number(configuration.pix_fee_fixed));
	if (method === 'boleto') return roundMoney(Number(configuration.boleto_fee_fixed));

	const percentage =
		installments >= 7
			? Number(configuration.card_installment_7_12_percentage)
			: installments >= 2
				? Number(configuration.card_installment_2_6_percentage)
				: Number(configuration.card_fee_percentage);

	return roundMoney(paidAmount * (percentage / 100) + Number(configuration.card_fee_fixed));
}

export function calculateOrganizerNet(
	_baseAmount: number,
	buyerPaidAmount: number,
	platformFee: number,
	providerFee: number,
) {
	// O cupom pode reduzir a cobrança sem mudar o preço base original.
	return roundMoney(Math.max(0, buyerPaidAmount - platformFee - providerFee));
}
