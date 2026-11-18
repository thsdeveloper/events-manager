import { describe, expect, it } from 'vitest';
import { DEFAULT_GATEWAY_FEES, DEFAULT_CARD_RATES, quoteGatewayFee, quoteWithdrawalFee } from './payment-fees.js';
import { organizerPaymentSettingsSchema, paymentSettingsSchema } from './payment-settings.js';

const settings = {
	...DEFAULT_GATEWAY_FEES,
	platform_fee_percentage: 5,
	platform_fee_minimum: 0,
	minimum_payout: 3.5,
	payouts_enabled: false,
	convenience_fee_calculation_method: 'buyer_pays',
	gateway_card_settlement_period: 'D+1',
};

describe('payment settings validation', () => {
	it('keeps all gateway rates separate from platform fees', () => {
		expect(paymentSettingsSchema.parse(settings)).toEqual(settings);
	});
	it.each([-1, 101, NaN, Infinity])('rejects invalid credit percentages: %s', (rate) => {
		expect(
			paymentSettingsSchema.safeParse({
				...settings,
				card_rates: { ...DEFAULT_CARD_RATES, 'D+7': [rate, ...DEFAULT_CARD_RATES['D+7'].slice(1)] },
			}).success,
		).toBe(false);
	});
	it('requires all twelve installments for each settlement period', () => {
		expect(
			paymentSettingsSchema.safeParse({ ...settings, card_rates: { ...DEFAULT_CARD_RATES, 'D+1': [5.42, 17.37] } })
				.success,
		).toBe(false);
	});
	it.each([
		'pix_fee_fixed',
		'boleto_fee_fixed',
		'debit_fee_fixed',
		'payout_pix_excess_fee',
		'ted_fee_fixed',
		'monthly_fee',
		'pix_qr_fee',
		'boleto_issue_fee',
	])('rejects negative %s', (key) => {
		expect(paymentSettingsSchema.safeParse({ ...settings, [key]: -0.01 }).success).toBe(false);
	});
	it('rejects fractional withdrawal counts', () => {
		expect(paymentSettingsSchema.safeParse({ ...settings, payout_pix_monthly_limit: 1.5 }).success).toBe(false);
	});
	it('accepts multiple methods with an explicit credit period', () => {
		const input = {
			accepted_payment_methods: ['PIX', 'CARD', 'BOLETO', 'DEBIT'],
			credit_card_settlement_period: 'D+15',
		};
		expect(organizerPaymentSettingsSchema.parse(input)).toEqual(input);
	});
	it.each([
		{ accepted_payment_methods: [] },
		{ accepted_payment_methods: ['PIX', 'PIX'] },
		{ accepted_payment_methods: ['CARD'] },
		{ accepted_payment_methods: ['CARD'], credit_card_settlement_period: 'D+2' },
		{ accepted_payment_methods: ['CRYPTO'] },
		{ accepted_payment_methods: ['PIX'], organizer_id: 'another-owner' },
	])('rejects invalid organizer preferences: %j', (input) => {
		expect(organizerPaymentSettingsSchema.safeParse(input).success).toBe(false);
	});
	it('permits Pix without a card settlement choice', () => {
		expect(organizerPaymentSettingsSchema.parse({ accepted_payment_methods: ['PIX'] })).toEqual({
			accepted_payment_methods: ['PIX'],
			credit_card_settlement_period: null,
		});
	});
});

describe('shared gateway schedule', () => {
	it.each(Object.entries(DEFAULT_CARD_RATES))('uses every published installment for %s', (period, rates) => {
		rates.forEach((percentage, index) =>
			expect(
				quoteGatewayFee(100, 'card', DEFAULT_GATEWAY_FEES, index + 1, period as keyof typeof DEFAULT_CARD_RATES),
			).toMatchObject({ percentage, fixed: 0.6, fee: Math.round((percentage + 0.6) * 100) / 100, settlement: period }),
		);
	});
	it.each([
		['pix', 0.8, 'Na hora'],
		['boleto_pix', 0.8, 'Na hora'],
		['boleto', 2.5, 'D+3 úteis'],
		['debit', 3.1, 'D+1'],
		['free', 0, 'Na hora'],
	] as const)('quotes %s', (method, fee, settlement) => {
		expect(quoteGatewayFee(100, method, DEFAULT_GATEWAY_FEES)).toMatchObject({ fee, settlement });
		expect(quoteGatewayFee(0, method, DEFAULT_GATEWAY_FEES).fee).toBe(0);
	});
	it.each([0, 13, 1.5])('rejects unsupported installment counts %s', (count) => {
		expect(() => quoteGatewayFee(100, 'card', DEFAULT_GATEWAY_FEES, count)).toThrow();
	});
	it('switches the Pix withdrawal fee at the twenty-first withdrawal', () => {
		expect(quoteWithdrawalFee('PIX', 0, DEFAULT_GATEWAY_FEES)).toBe(0.8);
		expect(quoteWithdrawalFee('PIX', 19, DEFAULT_GATEWAY_FEES)).toBe(0.8);
		expect(quoteWithdrawalFee('PIX', 20, DEFAULT_GATEWAY_FEES)).toBe(2.5);
		expect(quoteWithdrawalFee('TED', 0, DEFAULT_GATEWAY_FEES)).toBe(5);
		expect(() => quoteWithdrawalFee('PIX', -1, DEFAULT_GATEWAY_FEES)).toThrow();
	});
});

// Public normalization and organization availability are shared with both HTTP and React consumers.
import { readGatewayFees, readOrganizerPayments, paymentAvailability } from './payment-settings.js';
it('normalizes a public fee response without leaking operational fields', () => {
	expect(
		readGatewayFees({
			gateway_secret: 'must-not-leak',
			pix_fee_fixed: '1.25',
			debit_fee_fixed: -1,
			card_rates: { 'D+1': [] },
		}),
	).toEqual({ ...DEFAULT_GATEWAY_FEES, pix_fee_fixed: 1.25 });
	expect(readGatewayFees(DEFAULT_GATEWAY_FEES)).toEqual(DEFAULT_GATEWAY_FEES);
	expect(readOrganizerPayments(null)).toEqual({
		accepted_payment_methods: ['PIX'],
		credit_card_settlement_period: null,
	});
	expect(readOrganizerPayments({ accepted_payment_methods: ['BOLETO'], credit_card_settlement_period: null })).toEqual({
		accepted_payment_methods: ['BOLETO'],
		credit_card_settlement_period: null,
	});
});
it('distinguishes unsupported integration, disabled gateway and mismatched settlement', () => {
	expect(
		paymentAvailability(
			{ accepted_payment_methods: ['PIX', 'CARD', 'BOLETO', 'DEBIT'], credit_card_settlement_period: 'D+7' },
			['PIX', 'CARD'],
			'D+1',
		),
	).toEqual({
		available_methods: ['PIX'],
		pending_methods: [
			{ method: 'CARD', reason: 'settlement' },
			{ method: 'BOLETO', reason: 'gateway' },
			{ method: 'DEBIT', reason: 'integration' },
		],
	});
	expect(
		paymentAvailability({ accepted_payment_methods: ['CARD'], credit_card_settlement_period: 'D+7' }, ['CARD'], 'D+7'),
	).toEqual({ available_methods: ['CARD'], pending_methods: [] });
});
