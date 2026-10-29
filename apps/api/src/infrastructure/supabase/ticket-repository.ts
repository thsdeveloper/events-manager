import type { AttendeePatch, TicketRepository } from '../../application/tickets/ticket-service.js';
import type { SupabaseClients } from './clients.js';
import { mapNominalTicket, nominalTicketSelection } from './ticket-selection.js';

const VISIBLE_PAYMENT_STATUSES = ['paid', 'free', 'pending'];

export class SupabaseTicketRepository implements TicketRepository {
	constructor(private readonly clients: SupabaseClients) {}

	/**
	 * Duas consultas em vez de um `or` atravessando a relação: o PostgREST não
	 * combina, num mesmo `or`, um filtro na tabela e outro na tabela embutida.
	 */
	async listForUser(userId: string, email: string) {
		const [bought, named] = await Promise.all([
			this.clients.admin
				.from('registration_tickets')
				.select(nominalTicketSelection)
				.eq('registration.user_id', userId)
				.in('registration.payment_status', VISIBLE_PAYMENT_STATUSES)
				.order('date_created', { ascending: false }),
			this.clients.admin
				.from('registration_tickets')
				.select(nominalTicketSelection)
				.ilike('attendee_email', email)
				.in('registration.payment_status', ['paid', 'free'])
				.order('date_created', { ascending: false }),
		]);
		if (bought.error) throw bought.error;
		if (named.error) throw named.error;

		const seen = new Set<string>();
		const rows = [...(bought.data ?? []), ...(named.data ?? [])].filter((row) => {
			if (seen.has(row.id)) return false;
			seen.add(row.id);

			return true;
		});

		return rows
			.map((row) => mapNominalTicket(row as unknown as Record<string, unknown>))
			.sort((left, right) => right.date_created.localeCompare(left.date_created) || left.sequence - right.sequence);
	}

	async findForBuyer(ticketId: string, userId: string) {
		const { data, error } = await this.clients.admin
			.from('registration_tickets')
			.select(nominalTicketSelection)
			.eq('id', ticketId)
			.eq('registration.user_id', userId)
			.maybeSingle();
		if (error) throw error;

		return data ? mapNominalTicket(data as unknown as Record<string, unknown>) : null;
	}

	async updateAttendee(ticketId: string, patch: AttendeePatch) {
		const { data, error } = await this.clients.admin
			.from('registration_tickets')
			.update(patch)
			.eq('id', ticketId)
			.select(nominalTicketSelection)
			.single();
		if (error) throw error;

		return mapNominalTicket(data as unknown as Record<string, unknown>);
	}
}
