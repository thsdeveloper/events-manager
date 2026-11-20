import type { NominalTicket } from '@events-manager/contracts';
export function isPaid(ticket: NominalTicket): boolean {
	return (
		ticket.registration.status === 'confirmed' && ['paid', 'free'].includes(ticket.registration.payment_status ?? '')
	);
}
export function canShowQr(ticket: NominalTicket): boolean {
	return (
		isPaid(ticket) && Boolean(ticket.attendee_name?.trim() && ticket.attendee_email?.trim()) && !ticket.check_in_date
	);
}
export function groupTickets(tickets: NominalTicket[]): { id: string; tickets: NominalTicket[] }[] {
	const groups = new Map<string, NominalTicket[]>();
	for (const ticket of tickets) {
		const id = ticket.registration.checkout_group_id || ticket.registration.id;
		const group = groups.get(id) ?? [];
		group.push(ticket);
		groups.set(id, group);
	}
	return Array.from(groups, ([id, values]) => ({ id, tickets: values }));
}
