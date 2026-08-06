import type { TicketInput } from '@events-manager/contracts';
import type {
	AdminRepository,
	AdminTicket,
	ParticipantQuery,
	TicketQuery,
} from '../../application/admin/admin-service.js';
import type { SupabaseClients } from './clients.js';
import { sanitizePostgrestOrTerm } from './search.js';

const registrationSelection = `
  *,
  event_id:events!inner(id,title,slug,start_date,end_date,location_name,location_address,organizer_id),
  ticket_type_id:event_tickets(id,title,price,description),
  user_id:profiles(id,first_name,last_name,email,avatar)
`;

export class SupabaseAdminRepository implements AdminRepository {
	constructor(private readonly clients: SupabaseClients) {}

	async getConfiguration() {
		const { data, error } = await this.clients.admin.from('event_configurations').select('*').eq('id', 1).single();
		if (error) throw error;
		return data;
	}

	async getPlatformFeePercentage() {
		const data = (await this.getConfiguration()) as { platform_fee_percentage?: number | null };
		return Number(data.platform_fee_percentage ?? 0);
	}

	async listOwnedEventIds(organizerId: string) {
		const { data, error } = await this.clients.admin.from('events').select('id').eq('organizer_id', organizerId);
		if (error) throw error;
		return (data ?? []).map((event) => event.id);
	}

	async listEventOptions(organizerId: string) {
		const { data, error } = await this.clients.admin
			.from('events')
			.select('id,title,start_date')
			.eq('organizer_id', organizerId)
			.order('start_date', { ascending: false });
		if (error) throw error;
		return data ?? [];
	}

	async listTickets(eventIds: string[], query: TicketQuery) {
		const from = (query.page - 1) * 20;
		let builder = this.clients.admin
			.from('event_tickets')
			.select('*,event_id:events!inner(id,title,start_date,cover_image:media_files(*))', { count: 'exact' })
			.in('event_id', eventIds)
			.range(from, from + 19)
			.order('date_created', { ascending: false });
		if (query.search) builder = builder.ilike('title', `%${query.search}%`);
		if (query.status) builder = builder.in('status', query.status.split(','));
		const { data, count, error } = await builder;
		if (error) throw error;
		return { data: data ?? [], total: count ?? 0 };
	}

	async createTicket(input: TicketInput & { buyer_price: number; quantity_sold: number; sort: number }) {
		const { data, error } = await this.clients.admin.from('event_tickets').insert(input).select('*').single();
		if (error) throw error;
		return data;
	}

	async findTicket(id: string) {
		const { data, error } = await this.clients.admin
			.from('event_tickets')
			.select('*,event_id:events!inner(id,organizer_id)')
			.eq('id', id)
			.maybeSingle();
		if (error) throw error;
		return data as unknown as AdminTicket | null;
	}

	async updateTicket(id: string, input: Record<string, unknown>) {
		const { data, error } = await this.clients.admin
			.from('event_tickets')
			.update(input)
			.eq('id', id)
			.select('*')
			.single();
		if (error) throw error;
		return data;
	}

	async deleteTicket(id: string) {
		const { error } = await this.clients.admin.from('event_tickets').delete().eq('id', id);
		if (error) throw error;
	}

	async duplicateTicket(input: Record<string, unknown>) {
		const { data, error } = await this.clients.admin.from('event_tickets').insert(input).select('*').single();
		if (error) throw error;
		return data;
	}

	async listParticipantFilterOptions(eventIds: string[]) {
		if (!eventIds.length) return { events: [], ticketTypes: [] };
		const [events, tickets] = await Promise.all([
			this.clients.admin
				.from('events')
				.select('id,title')
				.in('id', eventIds)
				.order('date_created', { ascending: false }),
			this.clients.admin.from('event_tickets').select('id,title').in('event_id', eventIds).order('title'),
		]);
		if (events.error) throw events.error;
		if (tickets.error) throw tickets.error;
		return { events: events.data ?? [], ticketTypes: tickets.data ?? [] };
	}

	async listParticipants(eventIds: string[], query: ParticipantQuery) {
		let builder = this.clients.admin
			.from('event_registrations')
			.select(registrationSelection, { count: 'exact' })
			.in('event_id', eventIds);
		if (query.search) {
			const search = sanitizePostgrestOrTerm(query.search);
			if (search)
				builder = builder.or(
					`participant_name.ilike.%${search}%,participant_email.ilike.%${search}%,ticket_code.ilike.%${search}%`,
				);
		}
		if (query.ticketTypeIds) builder = builder.in('ticket_type_id', query.ticketTypeIds.split(','));
		if (query.registrationStatus) builder = builder.in('status', query.registrationStatus.split(','));
		if (query.paymentStatus) builder = builder.in('payment_status', query.paymentStatus.split(','));
		if (query.hasCheckedIn === 'true') builder = builder.not('check_in_date', 'is', null);
		if (query.hasCheckedIn === 'false') builder = builder.is('check_in_date', null);
		const from = (query.page - 1) * query.limit;
		const result = await builder
			.order(query.sortField, { ascending: query.sortDirection === 'asc' })
			.range(from, from + query.limit - 1);
		if (result.error) throw result.error;
		const { data: metricRows, error } = await this.clients.admin
			.from('event_registrations')
			.select('status,check_in_date')
			.in('event_id', eventIds);
		if (error) throw error;
		return { data: result.data ?? [], total: result.count ?? 0, metricRows: metricRows ?? [] };
	}

	async findOwnedRegistration(organizerId: string, id: string) {
		const { data, error } = await this.clients.admin
			.from('event_registrations')
			.select(registrationSelection)
			.eq('id', id)
			.eq('event_id.organizer_id', organizerId)
			.maybeSingle();
		if (error) throw error;
		return data;
	}

	async updateRegistration(id: string, input: Record<string, unknown>) {
		const { data, error } = await this.clients.admin
			.from('event_registrations')
			.update(input)
			.eq('id', id)
			.select('*')
			.single();
		if (error) throw error;
		return data;
	}

	async cancelRegistration(organizerId: string, id: string, reason: string) {
		const { data, error } = await this.clients.admin.rpc('cancel_registration_by_organizer', {
			target_organizer: organizerId,
			target_registration: id,
			target_reason: reason,
		});
		if (error) throw error;
		return data;
	}
}
