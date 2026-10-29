/**
 * Ingressos nominais no checkout. Cada unidade comprada pode ter um
 * participante próprio; quem compra pode deixar unidades para nomear depois,
 * mas nunca informar menos (ou mais) participantes do que unidades.
 */
import { describe, expect, it } from 'vitest';
import { checkoutAttendeeSchema, checkoutTicketSelectionSchema } from './tickets.js';

const TICKET_ID = '00000000-0000-4000-8000-000000000060';

describe('checkoutAttendeeSchema', () => {
	it('needs a name and a valid e-mail; document and phone are optional', () => {
		expect(checkoutAttendeeSchema.parse({ name: ' Bia ', email: 'bia@events.local' })).toEqual({
			name: 'Bia',
			email: 'bia@events.local',
		});
		expect(checkoutAttendeeSchema.safeParse({ name: '', email: 'bia@events.local' }).success).toBe(false);
		expect(checkoutAttendeeSchema.safeParse({ name: 'Bia', email: 'bia' }).success).toBe(false);
	});

	it('normalizes the document and the phone to digits', () => {
		expect(
			checkoutAttendeeSchema.parse({
				name: 'Bia',
				email: 'bia@events.local',
				document: '390.533.447-05',
				phone: '(11) 99999-9999',
			}),
		).toMatchObject({ document: '39053344705', phone: '11999999999' });
	});
});

describe('checkoutTicketSelectionSchema', () => {
	it('accepts a selection without attendees, to be named later', () => {
		expect(checkoutTicketSelectionSchema.parse({ ticketId: TICKET_ID, quantity: 2 })).toEqual({
			ticketId: TICKET_ID,
			quantity: 2,
		});
	});

	it('lets a unit stay pending with null, but demands one slot per unit', () => {
		const ok = checkoutTicketSelectionSchema.safeParse({
			ticketId: TICKET_ID,
			quantity: 2,
			attendees: [null, { name: 'Bia', email: 'bia@events.local' }],
		});
		const short = checkoutTicketSelectionSchema.safeParse({
			ticketId: TICKET_ID,
			quantity: 2,
			attendees: [{ name: 'Bia', email: 'bia@events.local' }],
		});

		expect(ok.success).toBe(true);
		expect(short.success).toBe(false);
	});
});
