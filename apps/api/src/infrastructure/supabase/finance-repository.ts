import type {
	FinanceEvent,
	FinanceInstallment,
	FinancePayout,
	FinanceRegistration,
	FinanceRepository,
	FinanceTicket,
} from '../../application/finance/finance-service.js';
import type { SupabaseClients } from './clients.js';

export class SupabaseFinanceRepository implements FinanceRepository {
	constructor(private readonly clients: SupabaseClients) {}

	async listRegistrations(organizerId: string) {
		const { data, error } = await this.clients.admin
			.from('event_registrations')
			.select('*,event_id:events!inner(id,title,organizer_id),ticket_type_id:event_tickets(id,title)')
			.eq('event_id.organizer_id', organizerId);
		if (error) throw error;
		return (data ?? []) as unknown as FinanceRegistration[];
	}

	async listEvents(organizerId: string) {
		const { data, error } = await this.clients.admin
			.from('events')
			.select('id,title,start_date,status')
			.eq('organizer_id', organizerId)
			.order('title');
		if (error) throw error;
		return (data ?? []) as FinanceEvent[];
	}

	async listTransactions(
		registrationIds: string[],
		query: {
			dateFrom?: string;
			dateTo?: string;
			limit: number;
			page: number;
			sortDirection: 'asc' | 'desc';
			status?: string;
		},
	) {
		let builder = this.clients.admin
			.from('payment_transactions')
			.select(
				'*,registration_id:event_registrations(*,event_id:events(id,title),ticket_type_id:event_tickets(id,title))',
				{ count: 'exact' },
			)
			.in('registration_id', registrationIds);
		if (query.status) builder = builder.eq('status', query.status);
		if (query.dateFrom) builder = builder.gte('date_created', query.dateFrom);
		if (query.dateTo) builder = builder.lte('date_created', query.dateTo);
		const from = (query.page - 1) * query.limit;
		const { data, count, error } = await builder
			.order('date_created', { ascending: query.sortDirection === 'asc' })
			.range(from, from + query.limit - 1);
		if (error) throw error;
		return { data: data ?? [], total: count ?? 0 };
	}

	async listSucceededTransactionNets(registrationIds: string[]) {
		if (!registrationIds.length) return [];
		const { data, error } = await this.clients.admin
			.from('payment_transactions')
			.select('organizer_net')
			.in('registration_id', registrationIds)
			.eq('status', 'succeeded');
		if (error) throw error;
		return (data ?? []).map((row) => Number(row.organizer_net ?? 0));
	}

	async listPayouts(organizerId: string) {
		const { data, error } = await this.clients.admin
			.from('organizer_payouts')
			.select('*')
			.eq('organizer_id', organizerId)
			.order('requested_at', { ascending: false })
			.limit(25);
		if (error) throw error;
		return (data ?? []) as FinancePayout[];
	}

	async listTickets(eventIds: string[]) {
		if (!eventIds.length) return [];
		const { data, error } = await this.clients.admin.from('event_tickets').select('*').in('event_id', eventIds);
		if (error) throw error;
		return (data ?? []) as FinanceTicket[];
	}

	async listInstallments(registrationIds: string[]) {
		if (!registrationIds.length) return [];
		const { data, error } = await this.clients.admin
			.from('payment_installments')
			.select('*')
			.in('registration_id', registrationIds);
		if (error) throw error;
		return (data ?? []) as FinanceInstallment[];
	}
}
