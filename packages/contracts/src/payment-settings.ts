import { z } from 'zod';
import { CARD_SETTLEMENT_PERIODS, DEFAULT_GATEWAY_FEES, type GatewayFees } from './payment-fees.js';

export const acceptedPaymentMethodSchema = z.enum(['PIX', 'CARD', 'BOLETO', 'DEBIT']);
export const cardSettlementPeriodSchema = z.enum(CARD_SETTLEMENT_PERIODS);
export const organizerPaymentSettingsSchema = z
	.object({
		accepted_payment_methods: z
			.array(acceptedPaymentMethodSchema)
			.min(1, 'Selecione pelo menos uma forma de pagamento.')
			.max(4)
			.refine((methods) => new Set(methods).size === methods.length, 'Não repita formas de pagamento.'),
		credit_card_settlement_period: cardSettlementPeriodSchema.nullable().default(null),
	})
	.strict()
	.refine((value) => !value.accepted_payment_methods.includes('CARD') || value.credit_card_settlement_period !== null, {
		path: ['credit_card_settlement_period'],
		message: 'Escolha quando deseja receber as vendas no cartão de crédito.',
	});
export type AcceptedPaymentMethod = z.infer<typeof acceptedPaymentMethodSchema>;
export type OrganizerPaymentSettings = z.infer<typeof organizerPaymentSettingsSchema>;
export const DEFAULT_ORGANIZER_PAYMENTS: OrganizerPaymentSettings = {
	accepted_payment_methods: ['PIX'],
	credit_card_settlement_period: null,
};

const amount = z.coerce.number().finite().min(0).max(1_000_000);
const percentage = z.coerce.number().finite().min(0).max(100);
const installments = z.array(percentage).length(12, 'Informe uma taxa para cada parcela, de 1x a 12x.');
export const cardFeeRatesSchema = z
	.object({ 'D+1': installments, 'D+7': installments, 'D+15': installments, 'D+30': installments })
	.strict();

export const paymentSettingsSchema = z
	.object({
		platform_fee_percentage: percentage,
		platform_fee_minimum: amount.default(0),
		pix_fee_fixed: amount,
		card_fee_fixed: amount,
		boleto_fee_fixed: amount,
		payout_fee_fixed: amount,
		minimum_payout: amount.refine((value) => value >= 1, 'O repasse mínimo deve ser de pelo menos R$ 1,00.'),
		payouts_enabled: z.boolean(),
		convenience_fee_calculation_method: z.enum(['buyer_pays', 'organizer_absorbs']),
		card_rates: cardFeeRatesSchema.optional(),
		debit_fee_percentage: percentage.optional(),
		debit_fee_fixed: amount.optional(),
		payout_pix_monthly_limit: z.coerce.number().int().min(0).max(1_000_000).optional(),
		payout_pix_excess_fee: amount.optional(),
		ted_fee_fixed: amount.optional(),
		monthly_fee: amount.optional(),
		pix_qr_fee: amount.optional(),
		boleto_issue_fee: amount.optional(),
		gateway_card_settlement_period: cardSettlementPeriodSchema.optional(),
		// Kept for older clients; current simulations use the exact matrix above.
		card_fee_percentage: percentage.optional(),
		card_installment_2_6_percentage: percentage.optional(),
		card_installment_7_12_percentage: percentage.optional(),
	})
	.strict();
export type PaymentSettingsInput = z.infer<typeof paymentSettingsSchema>;

/** Explicit allowlist: never expose gateway credentials or operational switches publicly. */
export function readGatewayFees(value: Record<string, unknown>): GatewayFees {
	const result = { ...DEFAULT_GATEWAY_FEES };
	for (const key of Object.keys(DEFAULT_GATEWAY_FEES) as Array<keyof GatewayFees>) {
		if (key === 'card_rates') {
			result.card_rates = cardFeeRatesSchema.safeParse(value.card_rates).data ?? DEFAULT_GATEWAY_FEES.card_rates;
		} else {
			const parsed = amount.safeParse(value[key]);
			if (parsed.success) result[key] = parsed.data;
		}
	}
	return result;
}

export function readOrganizerPayments(value: unknown): OrganizerPaymentSettings {
	const row = value as Partial<OrganizerPaymentSettings> | null;
	return organizerPaymentSettingsSchema.parse({
		accepted_payment_methods: row?.accepted_payment_methods ?? ['PIX'],
		credit_card_settlement_period: row?.credit_card_settlement_period ?? null,
	});
}

export function paymentAvailability(
	settings: OrganizerPaymentSettings,
	storeMethods: string[],
	gatewayPeriod: string,
	{ testMode = false }: { testMode?: boolean } = {},
) {
	const available_methods: Array<'PIX' | 'CARD' | 'BOLETO'> = [];
	const pending_methods: Array<{ method: AcceptedPaymentMethod; reason: 'integration' | 'gateway' | 'settlement' }> =
		[];
	for (const method of settings.accepted_payment_methods) {
		if (method === 'DEBIT') pending_methods.push({ method, reason: 'integration' });
		else if (!storeMethods.includes(method)) pending_methods.push({ method, reason: 'gateway' });
		else if (method === 'CARD' && !testMode && settings.credit_card_settlement_period !== gatewayPeriod)
			pending_methods.push({ method, reason: 'settlement' });
		else available_methods.push(method);
	}
	return { available_methods, pending_methods };
}

export interface OrganizerPaymentSettingsResponse extends ReturnType<typeof paymentAvailability> {
	settings: OrganizerPaymentSettings;
	/** True only for development using a test gateway; does not change real settlement terms. */
	test_mode?: boolean;
	gateway_card_settlement_period: import('./payment-fees.js').CardSettlementPeriod;
}
