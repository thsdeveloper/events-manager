import type { NominalTicket } from '@events-manager/contracts';
import { canShowQr, groupTickets, isPaid } from './model';
export const ticket = (patch: Partial<NominalTicket> = {}): NominalTicket =>
	({
		id: 'ticket-1',
		ticket_code: 'EVT-SECRET',
		attendee_name: 'Ana Silva',
		attendee_email: 'ana@example.test',
		check_in_date: null,
		registration: { id: 'order-1', checkout_group_id: 'purchase-1', status: 'confirmed', payment_status: 'paid' },
		event: { title: 'Congresso', slug: 'congresso', start_date: '2027-12-01T12:00:00Z' },
		...patch,
	}) as NominalTicket;
describe('ticket wallet rules', () => {
	it('shows the QR only for a named, fully paid admission', () => expect(canShowQr(ticket())).toBe(true));
	it('releases a confirmed free ticket', () => {
		const value = ticket();
		value.registration.payment_status = 'free';
		expect(canShowQr(value)).toBe(true);
	});
	it.each(['pending', 'partial', 'overdue', 'refunded'])('does not release admission when payment is %s', (payment) => {
		const value = ticket();
		value.registration.payment_status = payment;
		expect(isPaid(value)).toBe(false);
		expect(canShowQr(value)).toBe(false);
	});
	it('does not release a paid ticket whose order was cancelled', () => {
		const value = ticket();
		value.registration.status = 'cancelled';
		expect(canShowQr(value)).toBe(false);
	});
	it('hides QR for unnamed participants and entries already checked in', () => {
		expect(canShowQr(ticket({ attendee_name: null }))).toBe(false);
		expect(canShowQr(ticket({ check_in_date: '2026-11-20T12:00:00Z' }))).toBe(false);
	});
	it('groups all units of one purchase into one card while keeping other purchases separate', () => {
		const other = ticket({ id: 'ticket-3' });
		other.registration = { ...other.registration, checkout_group_id: null, id: 'order-2' };
		const groups = groupTickets([ticket(), ticket({ id: 'ticket-2' }), other]);
		expect(groups.map((g) => [g.id, g.tickets.length])).toEqual([
			['purchase-1', 2],
			['order-2', 1],
		]);
	});
	it('returns no cards when the wallet is empty', () => expect(groupTickets([])).toEqual([]));
	it('requires the participant email as well as their name before admission', () =>
		expect(canShowQr(ticket({ attendee_email: null }))).toBe(false));
});
