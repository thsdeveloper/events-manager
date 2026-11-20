import type { Event } from '@events-manager/contracts';
import { purchaseAvailability } from './availability';
const now = new Date('2026-11-20T12:00:00Z');
const event = {
	status: 'published',
	end_date: '2026-12-01T12:00:00Z',
	tickets: [{ status: 'active', quantity: 100, quantity_sold: 10 }],
} as Event;
describe('event purchase availability', () => {
	it('allows an event with available tickets', () => expect(purchaseAvailability(event, now).enabled).toBe(true));
	it('does not sell a cancelled or finished event', () => {
		expect(purchaseAvailability({ ...event, status: 'cancelled' }, now).enabled).toBe(false);
		expect(purchaseAvailability({ ...event, end_date: '2026-10-01' }, now).label).toBe('Evento encerrado');
	});
	it('respects the registration start and end', () => {
		expect(purchaseAvailability({ ...event, registration_start: '2026-11-21' }, now).label).toBe('Inscrições em breve');
		expect(purchaseAvailability({ ...event, registration_end: '2026-11-19' }, now).label).toBe('Inscrições encerradas');
	});
	it('does not advertise sold-out tickets as available', () =>
		expect(
			purchaseAvailability(
				{ ...event, tickets: [{ ...(event.tickets![0] as object), status: 'sold_out' }] as Event['tickets'] },
				now,
			).label,
		).toBe('Ingressos indisponíveis'));
});
