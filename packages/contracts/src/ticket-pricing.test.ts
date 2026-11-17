import { describe, expect, it } from 'vitest';
import { calculateUnitPlatformFee, calculateUnitBuyerPrice } from './ticket-pricing.js';
describe('ticket pricing', () => {
	it('keeps free registrations free with a configured minimum', () => {
		expect(calculateUnitPlatformFee(0, { platform_fee_minimum: 3 })).toBe(0);
		expect(calculateUnitBuyerPrice(0, 'passed_to_buyer', { platform_fee_minimum: 3 })).toBe(0);
	});
	it('uses the greater of a unit percentage and unit minimum', () => {
		expect(calculateUnitPlatformFee(10, { platform_fee_percentage: 5, platform_fee_minimum: 3 })).toBe(3);
		expect(calculateUnitPlatformFee(100, { platform_fee_percentage: 5, platform_fee_minimum: 3 })).toBe(5);
	});
	it('rounds money and lets the organizer absorb the fee', () => {
		expect(calculateUnitBuyerPrice(49.99, 'passed_to_buyer', { platform_fee_percentage: 5 })).toBe(52.49);
		expect(calculateUnitBuyerPrice(10, 'absorbed', { platform_fee_minimum: 3 })).toBe(10);
	});
	it('rejects an invalid amount instead of returning a non-finite charge', () => {
		expect(() => calculateUnitPlatformFee(Infinity, {})).toThrow();
		expect(() => calculateUnitPlatformFee(10, { platform_fee_minimum: -1 })).toThrow();
	});
});
