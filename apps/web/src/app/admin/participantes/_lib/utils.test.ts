/**
 * Estado de um ingresso nominal no painel: cancelado pelo pedido, check-in da
 * própria unidade, pendente enquanto o pedido não foi pago.
 */
import { describe, expect, it } from 'vitest';
import { nominalTicket } from './fixtures';
import { deriveTicketStatus, getParticipantFullName } from './utils';

describe('deriveTicketStatus', () => {
	it('follows the order when it is cancelled, whatever the ticket says', () => {
		const ticket = nominalTicket({
			check_in_date: '2026-09-19T13:00:00.000Z',
			registration: { ...nominalTicket().registration, status: 'cancelled' },
		});

		expect(deriveTicketStatus(ticket)).toBe('cancelled');
	});

	it('marks the unit as checked in by its own check-in date', () => {
		expect(deriveTicketStatus(nominalTicket({ check_in_date: '2026-09-19T13:00:00.000Z' }))).toBe('checked_in');
		expect(deriveTicketStatus(nominalTicket())).toBe('confirmed');
	});

	it('stays pending while the order is unpaid', () => {
		const ticket = nominalTicket({
			registration: { ...nominalTicket().registration, status: 'pending', payment_status: 'pending' },
		});

		expect(deriveTicketStatus(ticket)).toBe('pending');
	});
});

describe('getParticipantFullName', () => {
	it('uses the attendee name and falls back to a placeholder when nobody was named yet', () => {
		expect(getParticipantFullName(nominalTicket())).toBe('Bia Lima');
		expect(getParticipantFullName(nominalTicket({ attendee_name: null, attendee_email: null }))).toBe(
			'Participante a informar',
		);
	});
});
