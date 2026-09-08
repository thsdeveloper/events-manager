import { describe, expect, it } from 'vitest';
import { ACCOUNT_TYPE_OPTIONS, formatCpf, signupDefaults } from './signup-defaults';

const user = {
	id: 'u1',
	email: 'ana@example.com',
	first_name: 'Ana',
	last_name: 'Silva',
	phone: '11999990000',
	document: '52998224725',
};

describe('signupDefaults', () => {
	it('prefills an individual with the name, e-mail, phone and CPF already on the profile', () => {
		expect(signupDefaults(user, 'individual')).toEqual({
			name: 'Ana Silva',
			email: 'ana@example.com',
			phone: '11999990000',
			document: '52998224725',
		});
	});

	it('keeps contact data for a company but leaves the brand name and CNPJ to be typed', () => {
		expect(signupDefaults(user, 'company')).toEqual({
			name: '',
			email: 'ana@example.com',
			phone: '11999990000',
			document: '',
		});
	});

	it('tolerates a profile without name or phone', () => {
		expect(signupDefaults({ ...user, first_name: null, last_name: null, phone: null }, 'individual')).toMatchObject({
			name: '',
			phone: '',
		});
	});
});

describe('account type options', () => {
	it('offers exactly the two ways of selling tickets', () => {
		expect(ACCOUNT_TYPE_OPTIONS.map((option) => option.value)).toEqual(['individual', 'company']);
	});

	it('shows the CPF masked for reading', () => {
		expect(formatCpf('52998224725')).toBe('529.982.247-25');
	});
});
