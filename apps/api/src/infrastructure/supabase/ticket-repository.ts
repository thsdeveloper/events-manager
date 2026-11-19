import type { PurchaseInstallment } from '@events-manager/contracts';
import type { AttendeePatch, TicketRepository } from '../../application/tickets/ticket-service.js';
import type { SupabaseClients } from './clients.js';
import { mapNominalTicket, nominalTicketSelection } from './ticket-selection.js';

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

	async listInstallments(registrationIds: string[], userId: string): Promise<PurchaseInstallment[]> {
		const { data, error } = await this.clients.admin
			.from('payment_installments')
			.select(
				'id,registration_id,installment_number,total_installments,amount,due_date,status,paid_at,registration:event_registrations!inner(user_id)',
			)
			.in('registration_id', registrationIds)
			.eq('registration.user_id', userId)
			.order('installment_number');
		if (error) throw error;
		return (data ?? []).map(({ registration: _registration, ...row }) => ({
			...row,
			amount: Number(row.amount),
		})) as PurchaseInstallment[];
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
