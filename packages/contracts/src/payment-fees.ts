/** AbacatePay public schedule, checked on 2026-11-18 at https://www.abacatepay.com/pricing. */
export const CARD_SETTLEMENT_PERIODS = ['D+1', 'D+7', 'D+15', 'D+30'] as const;
export type CardSettlementPeriod = (typeof CARD_SETTLEMENT_PERIODS)[number];
export type CardFeeRates = Record<CardSettlementPeriod, number[]>;

export const DEFAULT_CARD_RATES: CardFeeRates = {
	'D+1': [5.42, 6.92, 7.91, 8.91, 9.9, 10.9, 12.39, 13.39, 14.38, 15.38, 16.37, 17.37],
	'D+7': [5.03, 6.52, 7.52, 8.51, 9.51, 10.5, 12, 12.99, 13.99, 14.98, 15.98, 16.97],
	'D+15': [4.5, 5.99, 6.99, 7.98, 8.98, 9.97, 11.47, 12.46, 13.46, 14.45, 15.45, 16.44],
	'D+30': [3.5, 5, 5.99, 6.99, 7.98, 8.98, 10.47, 11.47, 12.46, 13.46, 14.45, 15.45],
};

export const DEFAULT_GATEWAY_FEES = {
	pix_fee_fixed: 0.8,
	boleto_fee_fixed: 2.5,
	card_fee_fixed: 0.6,
	card_rates: DEFAULT_CARD_RATES,
	debit_fee_percentage: 2.5,
	debit_fee_fixed: 0.6,
	payout_fee_fixed: 0.8,
	payout_pix_monthly_limit: 20,
	payout_pix_excess_fee: 2.5,
	ted_fee_fixed: 5,
	monthly_fee: 0,
	pix_qr_fee: 0,
	boleto_issue_fee: 0,
};

export type GatewayFees = typeof DEFAULT_GATEWAY_FEES;
export type GatewayFeeMethod = 'pix' | 'boleto' | 'boleto_pix' | 'card' | 'debit' | 'free';

export function quoteGatewayFee(
	amount: number,
	method: GatewayFeeMethod,
	fees: GatewayFees,
	installments = 1,
	period: CardSettlementPeriod = 'D+1',
) {
	if (!Number.isInteger(installments) || installments < 1 || installments > 12) {
		throw new RangeError('Escolha de 1 a 12 parcelas.');
	}
	const percentage =
		method === 'card' ? fees.card_rates[period][installments - 1] : method === 'debit' ? fees.debit_fee_percentage : 0;
	const fixed =
		method === 'card'
			? fees.card_fee_fixed
			: method === 'debit'
				? fees.debit_fee_fixed
				: method === 'boleto'
					? fees.boleto_fee_fixed
					: method === 'free'
						? 0
						: fees.pix_fee_fixed;
	return {
		percentage,
		fixed,
		fee: amount <= 0 || method === 'free' ? 0 : Math.round(((amount * percentage) / 100 + fixed) * 100) / 100,
		settlement: method === 'card' ? period : method === 'debit' ? 'D+1' : method === 'boleto' ? 'D+3 úteis' : 'Na hora',
	};
}

/** Count refers to the provider account in this calendar month, not each organizer. */
export function quoteWithdrawalFee(method: 'PIX' | 'TED', withdrawalsThisMonth: number, fees: GatewayFees) {
	if (!Number.isInteger(withdrawalsThisMonth) || withdrawalsThisMonth < 0)
		throw new RangeError('Quantidade de saques inválida.');
	return method === 'TED'
		? fees.ted_fee_fixed
		: withdrawalsThisMonth >= fees.payout_pix_monthly_limit
			? fees.payout_pix_excess_fee
			: fees.payout_fee_fixed;
}
