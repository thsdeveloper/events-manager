import type { Event, EventTicket } from '@events-manager/contracts';
export function purchaseAvailability(event: Event, now = new Date()): { enabled: boolean; label: string } {
	if (event.status && event.status !== 'published') return { enabled: false, label: 'Evento indisponível' };
	if (new Date(event.end_date) <= now) return { enabled: false, label: 'Evento encerrado' };
	if (event.registration_start && new Date(event.registration_start) > now)
		return { enabled: false, label: 'Inscrições em breve' };
	if (event.registration_end && new Date(event.registration_end) < now)
		return { enabled: false, label: 'Inscrições encerradas' };
	const tickets = (event.tickets ?? []).filter((t): t is EventTicket => typeof t !== 'string');
	const available = tickets.some(
		(t) =>
			(!t.status || t.status === 'active') &&
			(!t.visibility || t.visibility === 'public') &&
			t.quantity > (t.quantity_sold ?? 0) &&
			(!t.sale_start_date || new Date(t.sale_start_date) <= now) &&
			(!t.sale_end_date || new Date(t.sale_end_date) >= now),
	);
	if (tickets.length && !available) return { enabled: false, label: 'Ingressos indisponíveis' };
	return { enabled: true, label: event.is_free ? 'Garantir meu ingresso' : 'Escolher ingressos' };
}
