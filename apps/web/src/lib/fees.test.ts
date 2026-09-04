/**
 * Exemplo de referência do ciclo TDD para funções puras (projeto `unit`).
 * Um `it` por regra de negócio; os números vêm da política de taxas publicada.
 */
import { describe, expect, it } from 'vitest';
import { calculateBuyerPrice, calculateConvenienceFeePercentage, calculateFees, type FeeConfig } from './fees';

const config: FeeConfig = { platformFeePercentage: 5, providerPercentageFee: 3.5, providerFixedFee: 0.6 };

describe('calculateFees', () => {
	it('passes the platform fee to the buyer and charges the gateway on the total paid', () => {
		expect(calculateFees(100, 'passed_to_buyer', config)).toEqual({
			ticketPrice: 100,
			convenienceFee: 5,
			buyerPrice: 105,
			providerFee: 4.27,
			platformFee: 5,
			organizerReceives: 95.73,
		});
	});

	it('deducts both fees from the organizer when the fee is absorbed', () => {
		expect(calculateFees(100, 'absorbed', config)).toEqual({
			ticketPrice: 100,
			convenienceFee: 0,
			buyerPrice: 100,
			providerFee: 4.1,
			platformFee: 5,
			organizerReceives: 90.9,
		});
	});

	it('rounds every amount to cents so the summary adds up on screen', () => {
		const fees = calculateFees(33.33, 'passed_to_buyer', config);

		expect(fees.convenienceFee).toBe(1.67);
		expect(fees.buyerPrice).toBe(35);
		expect(fees.organizerReceives).toBe(31.51);
	});
});

describe('calculateBuyerPrice', () => {
	it('adds the convenience fee only when it is passed to the buyer', () => {
		expect(calculateBuyerPrice(100, 'passed_to_buyer', config)).toBe(105);
		expect(calculateBuyerPrice(100, 'absorbed', config)).toBe(100);
	});
});

describe('calculateConvenienceFeePercentage', () => {
	it('expresses the convenience fee as a percentage of the base price', () => {
		expect(calculateConvenienceFeePercentage(200, config)).toBe(5);
	});
});
