import { describe, expect, it } from 'vitest';
import { calculateProviderFee } from '../src/application/payments/fees.js';

const configuration = {
	platform_fee_percentage: 5,
	pix_fee_fixed: 0.8,
	card_fee_fixed: 0.6,
	card_fee_percentage: 3.5,
	card_installment_2_6_percentage: 4,
	card_installment_7_12_percentage: 4.5,
	boleto_fee_fixed: 2.5,
	debit_fee_percentage: 2.5,
	debit_fee_fixed: 0.6,
	card_rates: {
		'D+1': [5.42, 6.92, 7.91, 8.91, 9.9, 10.9, 12.39, 13.39, 14.38, 15.38, 16.37, 17.37],
		'D+7': [5.03, 6.52, 7.52, 8.51, 9.51, 10.5, 12, 12.99, 13.99, 14.98, 15.98, 16.97],
		'D+15': [4.5, 5.99, 6.99, 7.98, 8.98, 9.97, 11.47, 12.46, 13.46, 14.45, 15.45, 16.44],
		'D+30': [3.5, 5, 5.99, 6.99, 7.98, 8.98, 10.47, 11.47, 12.46, 13.46, 14.45, 15.45],
	},
};

describe('gateway fees by settlement and installment', () => {
	it.each([
		['D+1', 1, 6.02],
		['D+7', 2, 7.12],
		['D+15', 6, 10.57],
		['D+30', 12, 16.05],
	] as const)('uses the exact rate for %s in %i installments', (period, installments, expected) => {
		expect(calculateProviderFee(100, 'card', configuration, installments, period)).toBe(expected);
	});
	it('uses debit rates independently of credit settlement', () => {
		expect(calculateProviderFee(100, 'debit', configuration)).toBe(3.1);
	});
	it('charges the Pix fee when a boleto is paid via Pix', () => {
		expect(calculateProviderFee(100, 'boleto_pix', configuration)).toBe(0.8);
	});
	it('does not charge issuance or transaction fees for a free registration', () => {
		expect(calculateProviderFee(0, 'pix', configuration)).toBe(0);
	});
});
