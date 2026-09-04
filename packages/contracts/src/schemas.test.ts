/**
 * Exemplo de referência do ciclo TDD para contratos compartilhados.
 * Cada `it` documenta uma regra que API e web dependem em conjunto.
 */
import { describe, expect, it } from 'vitest';
import {
	birthDateSchema,
	cpfSchema,
	eventCreateSchema,
	isAtLeastYearsOld,
	MIN_REGISTRATION_AGE,
	newPasswordSchema,
	phoneVerificationConfirmSchema,
	phoneVerificationRequestSchema,
	registerSchema,
	ticketInputSchema,
	updateProfileSchema,
} from './schemas.js';

const validEvent = {
	title: 'Conferência de Produto',
	slug: 'conferencia-de-produto',
	start_date: '2026-10-01T18:00:00.000Z',
	end_date: '2026-10-01T21:00:00.000Z',
};

const validTicket = {
	event_id: '00000000-0000-4000-8000-000000000010',
	title: 'Lote 1',
	quantity: 100,
	price: 50,
	service_fee_type: 'passed_to_buyer' as const,
};

function issuePaths(result: { success: boolean; error?: { issues: Array<{ path: PropertyKey[] }> } }) {
	return result.error?.issues.map((issue) => issue.path.join('.')) ?? [];
}

describe('newPasswordSchema', () => {
	it.each(['Qsesbs2006#@!', 'senhÃ-2026', 'p4ss word!'])('accepts %s', (password) => {
		expect(newPasswordSchema.safeParse(password).success).toBe(true);
	});

	it.each([
		['too short', 'Ab1!'],
		['no letter', '12345678!'],
		['no number', 'abcdefgh!'],
		['no special character', 'abcdefg1'],
	])('rejects a password with %s', (_reason, password) => {
		expect(newPasswordSchema.safeParse(password).success).toBe(false);
	});
});

describe('eventCreateSchema', () => {
	it('accepts a free event without tickets', () => {
		const result = eventCreateSchema.safeParse({ ...validEvent, is_free: true });

		expect(result.success).toBe(true);
		expect(result.data?.tickets).toEqual([]);
	});

	it('requires at least one ticket for a paid event', () => {
		const result = eventCreateSchema.safeParse({ ...validEvent, is_free: false });

		expect(result.success).toBe(false);
		expect(issuePaths(result)).toContain('tickets');
	});

	it('rejects an end date before the start date', () => {
		const result = eventCreateSchema.safeParse({ ...validEvent, end_date: '2026-10-01T17:00:00.000Z' });

		expect(issuePaths(result)).toContain('end_date');
	});

	it('requires latitude and longitude to be informed together', () => {
		const result = eventCreateSchema.safeParse({ ...validEvent, latitude: -18.9 });

		expect(issuePaths(result)).toContain('longitude');
	});
});

describe('ticketInputSchema', () => {
	it('accepts a ticket with the minimum required fields', () => {
		expect(ticketInputSchema.safeParse(validTicket).success).toBe(true);
	});

	it('rejects a purchase maximum below the minimum', () => {
		const result = ticketInputSchema.safeParse({
			...validTicket,
			min_quantity_per_purchase: 3,
			max_quantity_per_purchase: 2,
		});

		expect(issuePaths(result)).toContain('max_quantity_per_purchase');
	});

	it('requires the installment count when installments are allowed', () => {
		const result = ticketInputSchema.safeParse({ ...validTicket, allow_installments: true });

		expect(issuePaths(result)).toContain('max_installments');
	});
});

function isoDate(date: Date) {
	return date.toISOString().slice(0, 10);
}

function yearsAgo(years: number, offsetDays = 0) {
	const date = new Date();
	date.setUTCFullYear(date.getUTCFullYear() - years);
	date.setUTCDate(date.getUTCDate() + offsetDays);
	return isoDate(date);
}

describe('isAtLeastYearsOld', () => {
	const today = new Date('2026-09-04T12:00:00.000Z');

	it('counts a birthday that falls today as a completed year', () => {
		expect(isAtLeastYearsOld('2013-09-04', 13, today)).toBe(true);
	});

	it('does not count a birthday that is still tomorrow', () => {
		expect(isAtLeastYearsOld('2013-09-05', 13, today)).toBe(false);
	});

	it('handles a leap-day birthday in a non-leap year', () => {
		expect(isAtLeastYearsOld('2012-02-29', 13, new Date('2025-02-28T12:00:00.000Z'))).toBe(false);
		expect(isAtLeastYearsOld('2012-02-29', 13, new Date('2025-03-01T12:00:00.000Z'))).toBe(true);
	});
});

describe('birthDateSchema', () => {
	it('requires the minimum registration age of 13', () => {
		expect(MIN_REGISTRATION_AGE).toBe(13);
		expect(birthDateSchema.safeParse(yearsAgo(13)).success).toBe(true);
		expect(birthDateSchema.safeParse(yearsAgo(13, 1)).success).toBe(false);
		expect(birthDateSchema.safeParse(yearsAgo(30)).success).toBe(true);
	});

	it('rejects dates in the future, impossible dates and other formats', () => {
		expect(birthDateSchema.safeParse(yearsAgo(-1)).success).toBe(false);
		expect(birthDateSchema.safeParse('2010-02-30').success).toBe(false);
		expect(birthDateSchema.safeParse('04/09/2010').success).toBe(false);
		expect(birthDateSchema.safeParse('').success).toBe(false);
	});
});

describe('registerSchema', () => {
	const valid = {
		email: 'ana@example.com',
		password: 'Qsesbs2006#@!',
		first_name: 'Ana',
		last_name: 'Silva',
		birth_date: yearsAgo(20),
	};

	it('requires a birth date so the age rule is checked at sign-up', () => {
		expect(registerSchema.safeParse(valid).success).toBe(true);
		expect(issuePaths(registerSchema.safeParse({ ...valid, birth_date: undefined }))).toContain('birth_date');
		expect(issuePaths(registerSchema.safeParse({ ...valid, birth_date: yearsAgo(12) }))).toContain('birth_date');
	});
});

describe('cpfSchema', () => {
	it('accepts a valid CPF with or without punctuation and stores only digits', () => {
		expect(cpfSchema.parse('529.982.247-25')).toBe('52998224725');
		expect(cpfSchema.parse('52998224725')).toBe('52998224725');
	});

	it('rejects an invalid check digit, repeated digits and a CNPJ', () => {
		expect(cpfSchema.safeParse('529.982.247-26').success).toBe(false);
		expect(cpfSchema.safeParse('111.111.111-11').success).toBe(false);
		expect(cpfSchema.safeParse('11.222.333/0001-81').success).toBe(false);
	});
});

describe('updateProfileSchema', () => {
	it('lets the birth date be corrected, still under the minimum age rule', () => {
		expect(updateProfileSchema.safeParse({ birth_date: yearsAgo(20) }).success).toBe(true);
		expect(updateProfileSchema.safeParse({ description: 'sem data' }).success).toBe(true);
		expect(issuePaths(updateProfileSchema.safeParse({ birth_date: yearsAgo(13, 1) }))).toContain('birth_date');
		expect(issuePaths(updateProfileSchema.safeParse({ birth_date: null }))).toContain('birth_date');
	});

	it('carries the current password that a CPF change must be confirmed with', () => {
		expect(
			updateProfileSchema.safeParse({ document: '529.982.247-25', current_password: 'Qsesbs2006#@!' }).success,
		).toBe(true);
		expect(issuePaths(updateProfileSchema.safeParse({ document: '529.982.247-25', current_password: '' }))).toContain(
			'current_password',
		);
	});

	it('accepts a Brazilian phone with punctuation, storing only its digits, and lets it be cleared', () => {
		expect(updateProfileSchema.safeParse({ phone: '(11) 91234-5678' }).data?.phone).toBe('11912345678');
		expect(updateProfileSchema.safeParse({ phone: '1134567890' }).success).toBe(true);
		expect(updateProfileSchema.safeParse({ phone: null }).success).toBe(true);
		expect(issuePaths(updateProfileSchema.safeParse({ phone: '(00) 1234-5678' }))).toContain('phone');
		expect(issuePaths(updateProfileSchema.safeParse({ phone: '123' }))).toContain('phone');
	});

	it('accepts the CPF as an optional document that can be cleared', () => {
		expect(updateProfileSchema.safeParse({ document: '529.982.247-25' }).data?.document).toBe('52998224725');
		expect(updateProfileSchema.safeParse({ document: null }).success).toBe(true);
		expect(updateProfileSchema.safeParse({ first_name: 'Ana' }).success).toBe(true);
		expect(issuePaths(updateProfileSchema.safeParse({ document: '123' }))).toContain('document');
	});
});

describe('phone verification schemas', () => {
	it('requires a valid Brazilian phone to request a code, stored as digits', () => {
		expect(phoneVerificationRequestSchema.parse({ phone: '(11) 91234-5678' })).toEqual({ phone: '11912345678' });
		expect(issuePaths(phoneVerificationRequestSchema.safeParse({ phone: '' }))).toContain('phone');
		expect(issuePaths(phoneVerificationRequestSchema.safeParse({ phone: '(00) 1234-5678' }))).toContain('phone');
	});

	it('confirms with the same phone and a six-digit code', () => {
		expect(phoneVerificationConfirmSchema.parse({ phone: '11912345678', token: ' 123456 ' })).toEqual({
			phone: '11912345678',
			token: '123456',
		});
		expect(issuePaths(phoneVerificationConfirmSchema.safeParse({ phone: '11912345678', token: '12345' }))).toContain(
			'token',
		);
		expect(issuePaths(phoneVerificationConfirmSchema.safeParse({ phone: '11912345678', token: 'abcdef' }))).toContain(
			'token',
		);
	});
});
