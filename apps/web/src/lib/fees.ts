/**
 * Funções utilitárias para cálculo de taxas de ingressos
 *
 * A taxa de serviço da plataforma pode ser repassada ao comprador. A tarifa do
 * gateway varia conforme o método escolhido no checkout e é exibida aqui como
 * estimativa de cartão à vista; o valor efetivo vem do webhook do AbacatePay.
 */

export interface FeeConfig {
	platformFeePercentage: number; // Taxa da plataforma (ex: 5 = 5%)
	providerPercentageFee: number;
	providerFixedFee: number;
}

export interface FeeCalculation {
	ticketPrice: number; // Preço base do ingresso
	convenienceFee: number; // Taxa de conveniência
	buyerPrice: number; // Total pago pelo comprador
	providerFee: number; // Estimativa da tarifa do gateway
	platformFee: number; // Taxa da plataforma
	organizerReceives: number; // Valor que o organizador recebe
}

/**
 * Calcula a taxa de conveniência que deve ser cobrada do comprador
 * A taxa de conveniência é a taxa da plataforma repassada ao comprador.
 */
export function calculateConvenienceFee(ticketPrice: number, config: FeeConfig): number {
	return Math.round(ticketPrice * (config.platformFeePercentage / 100) * 100) / 100;
}

/**
 * Calcula todas as taxas e valores envolvidos na transação
 */
export function calculateFees(
	ticketPrice: number,
	serviceFeeType: 'passed_to_buyer' | 'absorbed',
	config: FeeConfig,
): FeeCalculation {
	const { platformFeePercentage, providerPercentageFee, providerFixedFee } = config;

	let convenienceFee = 0;
	let buyerPrice = ticketPrice;
	let providerFee = 0;
	let platformFee = 0;
	let organizerReceives = 0;

	if (serviceFeeType === 'passed_to_buyer') {
		// Comprador paga a taxa de conveniência
		convenienceFee = calculateConvenienceFee(ticketPrice, config);
		buyerPrice = ticketPrice + convenienceFee;

		// Estimativa da tarifa de cartão à vista do gateway
		providerFee = (buyerPrice * providerPercentageFee) / 100 + providerFixedFee;

		// Taxa da plataforma sobre o preço base
		platformFee = (ticketPrice * platformFeePercentage) / 100;

		// O comprador já cobriu a taxa da plataforma.
		organizerReceives = ticketPrice - providerFee;
	} else {
		// Organizador absorve todas as taxas
		buyerPrice = ticketPrice;

		// Estimativa da tarifa de cartão à vista do gateway
		providerFee = (buyerPrice * providerPercentageFee) / 100 + providerFixedFee;

		// Taxa da plataforma sobre o preço base
		platformFee = (ticketPrice * platformFeePercentage) / 100;

		// Organizador recebe o valor menos todas as taxas
		organizerReceives = buyerPrice - providerFee - platformFee;
	}

	return {
		ticketPrice: Math.round(ticketPrice * 100) / 100,
		convenienceFee: Math.round(convenienceFee * 100) / 100,
		buyerPrice: Math.round(buyerPrice * 100) / 100,
		providerFee: Math.round(providerFee * 100) / 100,
		platformFee: Math.round(platformFee * 100) / 100,
		organizerReceives: Math.round(organizerReceives * 100) / 100,
	};
}

/**
 * Calcula o buyer_price (preço final para o comprador)
 */
export function calculateBuyerPrice(
	ticketPrice: number,
	serviceFeeType: 'passed_to_buyer' | 'absorbed',
	config: FeeConfig,
): number {
	if (serviceFeeType === 'passed_to_buyer') {
		const convenienceFee = calculateConvenienceFee(ticketPrice, config);

		return Math.round((ticketPrice + convenienceFee) * 100) / 100;
	}

	return Math.round(ticketPrice * 100) / 100;
}

/**
 * Formata valores monetários para exibição
 */
export function formatCurrency(value: number): string {
	return value.toLocaleString('pt-BR', {
		style: 'currency',
		currency: 'BRL',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

/**
 * Calcula a porcentagem que a taxa de conveniência representa sobre o preço base
 */
export function calculateConvenienceFeePercentage(ticketPrice: number, config: FeeConfig): number {
	const convenienceFee = calculateConvenienceFee(ticketPrice, config);

	return Math.round((convenienceFee / ticketPrice) * 10000) / 100; // Arredondar para 2 casas decimais
}

// ---------------------------------------------------------------------------
// Tabela pública de taxas e cálculo por forma de pagamento
// ---------------------------------------------------------------------------

/** Espelho de `GET /api/content/fees`: o que a plataforma divulga. */
export interface PublicFeeTable {
	boleto_fee_fixed: number;
	card_fee_fixed: number;
	card_fee_percentage: number;
	card_installment_2_6_percentage: number;
	card_installment_7_12_percentage: number;
	convenience_fee_calculation_method: 'buyer_pays' | 'organizer_absorbs';
	minimum_payout: number;
	payout_fee_fixed: number;
	pix_fee_fixed: number;
	platform_fee_percentage: number;
}

/** Valores publicados; usados quando a API não responde. */
export const DEFAULT_PUBLIC_FEES: PublicFeeTable = {
	platform_fee_percentage: 5,
	pix_fee_fixed: 0.8,
	card_fee_percentage: 3.5,
	card_fee_fixed: 0.6,
	card_installment_2_6_percentage: 4,
	card_installment_7_12_percentage: 4.5,
	boleto_fee_fixed: 2.5,
	payout_fee_fixed: 0.8,
	minimum_payout: 3.5,
	convenience_fee_calculation_method: 'buyer_pays',
};

export type PaymentMethod = 'pix' | 'card' | 'card_installments_2_6' | 'card_installments_7_12' | 'boleto';

export const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string; hint: string }> = [
	{ value: 'pix', label: 'PIX', hint: 'Tarifa fixa por transação' },
	{ value: 'card', label: 'Cartão à vista', hint: 'Percentual mais tarifa fixa' },
	{ value: 'card_installments_2_6', label: 'Cartão em 2 a 6 vezes', hint: 'Percentual do parcelamento' },
	{ value: 'card_installments_7_12', label: 'Cartão em 7 a 12 vezes', hint: 'Percentual do parcelamento' },
	{ value: 'boleto', label: 'Boleto', hint: 'Tarifa fixa por transação' },
];

/** Tarifa do gateway para um valor pago pelo comprador, conforme a forma escolhida. */
export function calculateProviderFee(buyerPrice: number, method: PaymentMethod, table: PublicFeeTable): number {
	switch (method) {
		case 'pix':
			return table.pix_fee_fixed;
		case 'boleto':
			return table.boleto_fee_fixed;
		case 'card':
			return (buyerPrice * table.card_fee_percentage) / 100 + table.card_fee_fixed;
		case 'card_installments_2_6':
			return (buyerPrice * table.card_installment_2_6_percentage) / 100 + table.card_fee_fixed;
		case 'card_installments_7_12':
			return (buyerPrice * table.card_installment_7_12_percentage) / 100 + table.card_fee_fixed;
	}
}

/**
 * A mesma conta de `calculateFees`, mas com a tarifa do gateway da forma de
 * pagamento escolhida, para a calculadora pública mostrar cada cenário.
 */
export function calculateFeesForMethod(
	ticketPrice: number,
	serviceFeeType: 'passed_to_buyer' | 'absorbed',
	method: PaymentMethod,
	table: PublicFeeTable,
): FeeCalculation {
	const config: FeeConfig = {
		platformFeePercentage: table.platform_fee_percentage,
		providerPercentageFee: table.card_fee_percentage,
		providerFixedFee: table.card_fee_fixed,
	};
	const platformFee = (ticketPrice * table.platform_fee_percentage) / 100;
	const convenienceFee = serviceFeeType === 'passed_to_buyer' ? calculateConvenienceFee(ticketPrice, config) : 0;
	const buyerPrice = ticketPrice + convenienceFee;
	const providerFee = calculateProviderFee(buyerPrice, method, table);
	const organizerReceives =
		serviceFeeType === 'passed_to_buyer' ? ticketPrice - providerFee : buyerPrice - providerFee - platformFee;
	const round = (value: number) => Math.round(value * 100) / 100;

	return {
		ticketPrice: round(ticketPrice),
		convenienceFee: round(convenienceFee),
		buyerPrice: round(buyerPrice),
		providerFee: round(providerFee),
		platformFee: round(platformFee),
		organizerReceives: round(organizerReceives),
	};
}
