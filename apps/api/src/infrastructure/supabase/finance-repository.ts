import type {
	FinanceEvent,
	FinanceInstallment,
	FinancePayout,
	FinanceRegistration,
	FinanceRepository,
	FinanceTicket,
} from '../../application/finance/finance-service.js';
import type { SupabaseClients } from './clients.js';

const MOVEMENT_FIELDS =
	'id,date_created,status,event_type,provider,provider_object_id,provider_event_id,amount,provider_fee,platform_fee,organizer_net,metadata';
const REGISTRATION_FIELDS =
	'id,status,payment_status,payment_method,participant_name,participant_email,participant_phone,participant_document,quantity,unit_price,service_fee,total_amount,payment_amount,is_installment_payment,total_installments,installment_plan_status,additional_info,date_created,date_updated,cancelled_at,cancelled_reason,provider_checkout_id,provider_refund_id,receipt_url,notes';
const TRANSACTION_FIELDS = `${MOVEMENT_FIELDS},registration_id:event_registrations!inner(${REGISTRATION_FIELDS},event_id:events(id,title,slug,start_date,end_date,location_name,location_address,event_type),ticket_type_id:event_tickets(id,title))`;
// Payment confirmation can precede the fee/settlement webhook. Keep ledger status intact for payouts.
const CONFIRMED_PAYMENT_FILTER =
	'status.eq.succeeded,and(status.eq.pending,event_type.eq.transparent.reconciled_paid),and(status.eq.pending,event_type.eq.transparent.completed,metadata->>provider_status.in.(PAID,APPROVED))';
const PENDING_PAYMENT_FILTER =
	'and(status.eq.pending,or(event_type.is.null,event_type.neq.transparent.reconciled_paid),or(event_type.is.null,event_type.neq.transparent.completed,metadata->>provider_status.is.null,metadata->>provider_status.not.in.(PAID,APPROVED)))';

export class SupabaseFinanceRepository implements FinanceRepository {
	constructor(
		private readonly clients: SupabaseClients,
		private readonly allowedEventIds: string[] | null = null,
	) {}

	async listRegistrations(organizerId: string) {
		let query = this.clients.admin
			.from('event_registrations')
			.select('*,event_id:events!inner(id,title,organizer_id),ticket_type_id:event_tickets(id,title)')
			.eq('event_id.organizer_id', organizerId);
		if (this.allowedEventIds !== null) query = query.in('event_id.id', this.allowedEventIds);
		const { data, error } = await query;
		if (error) throw error;
		return ((data ?? []) as unknown as FinanceRegistration[]).filter(
			(row) => this.allowedEventIds === null || this.allowedEventIds.includes(row.event_id?.id ?? ''),
		);
	}

	async listEvents(organizerId: string) {
		let query = this.clients.admin
			.from('events')
			.select('id,title,start_date,status')
			.eq('organizer_id', organizerId)
			.order('title');
		if (this.allowedEventIds !== null) query = query.in('id', this.allowedEventIds);
		const { data, error } = await query;
		if (error) throw error;
		return ((data ?? []) as FinanceEvent[]).filter(
			(row) => this.allowedEventIds === null || this.allowedEventIds.includes(row.id),
		);
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
			.select(TRANSACTION_FIELDS, { count: 'exact' })
			.in('registration_id', registrationIds);
		if (query.status === 'succeeded') builder = builder.or(CONFIRMED_PAYMENT_FILTER);
		else if (query.status === 'pending') builder = builder.or(PENDING_PAYMENT_FILTER);
		else if (query.status) builder = builder.eq('status', query.status);
		if (query.dateFrom) builder = builder.gte('date_created', query.dateFrom);
		if (query.dateTo) builder = builder.lte('date_created', query.dateTo);
		const from = (query.page - 1) * query.limit;
		const { data, count, error } = await builder
			.order('date_created', { ascending: query.sortDirection === 'asc' })
			.range(from, from + query.limit - 1);
		if (error) throw error;
		return { data: data ?? [], total: count ?? 0 };
	}

	async findTransaction(id: string, registrationIds: string[]) {
		if (!registrationIds.length) return null;
		const { data, error } = await this.clients.admin
			.from('payment_transactions')
			.select(TRANSACTION_FIELDS)
			.eq('id', id)
			.in('registration_id', registrationIds)
			.maybeSingle();
		if (error) throw error;
		return data;
	}

	async listRegistrationTransactions(registrationId: string) {
		const { data, error } = await this.clients.admin
			.from('payment_transactions')
			.select(MOVEMENT_FIELDS)
			.eq('registration_id', registrationId)
			.order('date_created', { ascending: false });
		if (error) throw error;
		return data ?? [];
	}

	async listRegistrationTickets(registrationId: string) {
		const { data, error } = await this.clients.admin
			.from('registration_tickets')
			.select(
				'id,sequence,ticket_code,attendee_name,attendee_email,is_buyer,check_in_date,named_at,unit_price,service_fee,discount,total_amount',
			)
			.eq('registration_id', registrationId)
			.order('sequence');
		if (error) throw error;
		return data ?? [];
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
