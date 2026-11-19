import type { Event, EventTicket } from '@events-manager/contracts';

export function publicTickets(event: Event) {
	return (event.tickets ?? []).filter(
		(ticket): ticket is EventTicket =>
			typeof ticket !== 'string' &&
			ticket.status !== 'inactive' &&
			(!ticket.visibility || ticket.visibility === 'public'),
	);
}

export function ticketSaleLabel(ticket: EventTicket, now: number) {
	if (
		ticket.status === 'sold_out' ||
		ticket.quantity - (ticket.quantity_sold ?? 0) < (ticket.min_quantity_per_purchase ?? 1)
	)
		return 'Esgotado';
	if (ticket.sale_start_date && Date.parse(ticket.sale_start_date) > now) return 'Em breve';
	if (ticket.sale_end_date && Date.parse(ticket.sale_end_date) < now) return 'Vendas encerradas';

	return 'Disponível';
}

export function eventPurchase(event: Event, now: number) {
	const tickets = publicTickets(event);
	const available = tickets.filter((ticket) => ticketSaleLabel(ticket, now) === 'Disponível');
	let closed: string | null = null;
	if (event.status === 'cancelled') closed = 'Evento cancelado';
	else if (Date.parse(event.end_date) < now) closed = 'Evento encerrado';
	else if (event.registration_end && Date.parse(event.registration_end) < now) closed = 'Inscrições encerradas';
	else if (event.registration_start && Date.parse(event.registration_start) > now) closed = 'Inscrições em breve';
	else if (!available.length)
		closed = tickets.some((ticket) => ticketSaleLabel(ticket, now) === 'Em breve')
			? 'Vendas em breve'
			: 'Ingressos indisponíveis';
	const price = available.length
		? Math.min(...available.map((ticket) => Number(ticket.buyer_price ?? ticket.price)))
		: null;

	return { tickets, available, closed, price, free: price === 0, href: `/eventos/${event.slug}/checkout` };
}

const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'America/Sao_Paulo' });
const time = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short', timeZone: 'America/Sao_Paulo' });
export function eventDateTime(value: string) {
	const parsed = new Date(value);

	return `${date.format(parsed)}, às ${time.format(parsed)}`;
}

export function eventAddress(event: Event) {
	return (
		event.location_address ||
		[
			[event.location_street, event.location_number].filter(Boolean).join(', '),
			event.location_complement,
			event.location_neighborhood,
			[event.location_city, event.location_state].filter(Boolean).join(' · '),
			event.location_postal_code,
		]
			.filter(Boolean)
			.join(' — ')
	);
}
