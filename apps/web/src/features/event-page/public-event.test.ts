import { describe, expect, it } from 'vitest';
import { eventAddress, eventDateTime, eventPurchase, publicTickets, ticketSaleLabel } from './public-event';
import { eventPageTicket as ticket, publicEventFixture as event } from '@/test/event-page-fixtures';

const now = Date.parse('2026-11-19T12:00:00Z');
describe('event purchase information', () => {
	it('excludes non-public and inactive tickets from prices and choices', () => {
		const tickets = publicTickets({
			...event,
			tickets: [
				ticket,
				{ ...ticket, id: 'private', visibility: 'invited_only' },
				{ ...ticket, id: 'manual', visibility: 'manual' },
				{ ...ticket, id: 'inactive', status: 'inactive' },
			],
		});
		expect(tickets).toEqual([ticket]);
		expect(publicTickets({ ...event, tickets: ['reference-only'] })).toEqual([]);
	});
	it.each([
		[{ quantity_sold: 100 }, 'Esgotado'],
		[{ status: 'sold_out' as const }, 'Esgotado'],
		[{ min_quantity_per_purchase: 95 }, 'Esgotado'],
		[{ sale_start_date: '2026-11-20T00:00:00Z' }, 'Em breve'],
		[{ sale_end_date: '2026-11-18T00:00:00Z' }, 'Vendas encerradas'],
		[{}, 'Disponível'],
	])('describes ticket availability %j', (changes, label) => {
		expect(ticketSaleLabel({ ...ticket, ...changes }, now)).toBe(label);
	});
	it.each([
		[{ status: 'cancelled' as const }, 'Evento cancelado'],
		[{ end_date: '2026-11-18T00:00:00Z' }, 'Evento encerrado'],
		[{ registration_end: '2026-11-18T00:00:00Z' }, 'Inscrições encerradas'],
		[{ registration_start: '2026-11-20T00:00:00Z' }, 'Inscrições em breve'],
		[{ tickets: [] }, 'Ingressos indisponíveis'],
		[{ tickets: [{ ...ticket, sale_start_date: '2026-11-20T00:00:00Z' }] }, 'Vendas em breve'],
	])('never offers checkout when %j', (changes, label) => {
		expect(eventPurchase({ ...event, ...changes }, now).closed).toBe(label);
	});
	it('keeps an explicitly free ticket free and ignores cheaper future tickets', () => {
		expect(eventPurchase({ ...event, tickets: [{ ...ticket, buyer_price: 0 }] }, now)).toMatchObject({
			free: true,
			price: 0,
		});
		expect(
			eventPurchase(
				{ ...event, tickets: [ticket, { ...ticket, buyer_price: 5, sale_start_date: '2026-12-01T00:00:00Z' }] },
				now,
			),
		).toMatchObject({ price: 210, closed: null });
		expect(eventPurchase({ ...event, tickets: [{ ...ticket, buyer_price: null }] }, now).price).toBe(200);
	});
	it('formats dates in the event timezone and composes complete addresses when needed', () => {
		expect(eventDateTime('2027-01-01T01:00:00Z')).toBe('31 de dezembro de 2026, às 22:00');
		expect(eventAddress(event)).toBe('Rua das Flores, 10');
		expect(
			eventAddress({
				...event,
				location_address: null,
				location_street: 'Rua A',
				location_number: '12',
				location_complement: 'Bloco B',
				location_neighborhood: 'Centro',
				location_postal_code: '70000-000',
			}),
		).toBe('Rua A, 12 — Bloco B — Centro — Brasília · DF — 70000-000');
	});
});
