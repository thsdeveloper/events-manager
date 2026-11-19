import { describe, expect, it } from 'vitest';
import { getCheckoutProfileMissingFields } from './checkout-profile.js';
const complete = {
	first_name: 'Ana',
	last_name: 'Silva',
	birth_date: '1990-05-20',
	email: 'ana@example.test',
	document: '52998224725',
	phone: '11999990000',
	phone_verified_at: '2026-11-19T10:00:00Z',
};
describe('minimum buyer profile', () => {
	it('allows a buyer with the required identity and verified phone, without avatar or address', () => {
		expect(getCheckoutProfileMissingFields(complete)).toEqual([]);
	});
	it.each(['first_name', 'last_name', 'birth_date', 'email', 'document', 'phone', 'phone_verified_at'] as const)(
		'requires %s on the account',
		(field) => {
			expect(getCheckoutProfileMissingFields({ ...complete, [field]: null })).toContain(field);
		},
	);
	it.each([
		['first_name', '   '],
		['last_name', ''],
		['birth_date', '2099-01-01'],
		['email', 'invalid'],
		['document', '11111111111'],
		['document', ''],
		['phone', ''],
		['phone', '123'],
		['phone_verified_at', 'not-a-date'],
	])('rejects invalid %s', (field, value) => {
		expect(getCheckoutProfileMissingFields({ ...complete, [field]: value })).toContain(field);
	});
	it('lists all requirements for a missing account', () => {
		expect(getCheckoutProfileMissingFields(null)).toHaveLength(7);
	});
});
