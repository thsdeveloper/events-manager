/**
 * Exemplo de referência do ciclo TDD para contratos compartilhados.
 * Cada `it` documenta uma regra que API e web dependem em conjunto.
 */
import { describe, expect, it } from 'vitest';
import { eventCreateSchema, newPasswordSchema, ticketInputSchema } from './schemas.js';

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
