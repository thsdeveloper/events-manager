import type {
	AuditContext,
	OrganizerPageQuery,
	SuperAdminRepository,
	TransactionPageQuery,
} from '../../application/super-admin/super-admin-service.js';
import type { Json } from '@events-manager/contracts';
import type { SupabaseClients } from './clients.js';
import { sanitizePostgrestOrTerm } from './search.js';

type Row = Record<string, unknown>;

export class SupabaseSuperAdminRepository implements SuperAdminRepository {
	constructor(private readonly clients: SupabaseClients) {}

	async getOverviewData() {
		const [organizers, events, registrations, transactions, recentTransactions, payouts] = await Promise.all([
			this.clients.admin.from('organizers').select('id,name,status,date_created'),
			this.clients.admin.from('events').select('id,title,status,organizer_id,start_date,date_created'),
			this.clients.admin
				.from('event_registrations')
				.select('id,event_id,payment_status,total_amount,quantity,date_created'),
			this.clients.admin.from('payment_transactions').select('status,provider_fee,platform_fee,organizer_net'),
			this.clients.admin
				.from('payment_transactions')
				.select(
					'*,registration_id:event_registrations(id,event_id,participant_name,event_id:events(id,title,organizer_id:organizers(id,name)))',
				)
				.order('date_created', { ascending: false })
				.limit(12),
			this.clients.admin.from('organizer_payouts').select('amount,status'),
		]);
		for (const result of [organizers, events, registrations, transactions, recentTransactions, payouts])
			if (result.error) throw result.error;
		return {
			organizers: (organizers.data ?? []) as unknown as Row[],
			events: (events.data ?? []) as unknown as Row[],
			registrations: (registrations.data ?? []) as unknown as Row[],
			transactions: (transactions.data ?? []) as unknown as Row[],
			recentTransactions: (recentTransactions.data ?? []) as unknown as Row[],
			payouts: (payouts.data ?? []) as unknown as Row[],
		};
	}

	async listOrganizerPage(query: OrganizerPageQuery) {
		let builder = this.clients.admin.from('organizers').select('*', { count: 'exact' });
		if (query.search) {
			const search = sanitizePostgrestOrTerm(query.search);
			if (search) builder = builder.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
		}
		if (query.status) builder = builder.eq('status', query.status);
		const from = (query.page - 1) * query.limit;
		const { data, count, error } = await builder
			.order('date_created', { ascending: false })
			.range(from, from + query.limit - 1);
		if (error) throw error;
		const organizerIds = (data ?? []).map((organizer) => organizer.id);
		const { data: events, error: eventsError } = organizerIds.length
			? await this.clients.admin.from('events').select('id,organizer_id').in('organizer_id', organizerIds)
			: { data: [], error: null };
		if (eventsError) throw eventsError;
		const eventIds = (events ?? []).map((event) => event.id);
		const { data: registrations, error: registrationsError } = eventIds.length
			? await this.clients.admin
					.from('event_registrations')
					.select('event_id,total_amount,quantity,payment_status')
					.in('event_id', eventIds)
			: { data: [], error: null };
		if (registrationsError) throw registrationsError;
		return {
			data: (data ?? []) as unknown as Row[],
			events: (events ?? []) as unknown as Row[],
			registrations: (registrations ?? []) as unknown as Row[],
			total: count ?? 0,
		};
	}

	async updateOrganizer(id: string, input: Record<string, unknown>) {
		const { data: before, error: beforeError } = await this.clients.admin
			.from('organizers')
			.select('*')
			.eq('id', id)
			.maybeSingle();
		if (beforeError) throw beforeError;
		if (!before) return null;
		const { data, error } = await this.clients.admin.from('organizers').update(input).eq('id', id).select('*').single();
		if (error) throw error;
		if (input.status === 'active' && before.user_id) {
			const { error: roleError } = await this.clients.admin
				.from('profiles')
				.update({ role: 'organizer' })
				.eq('id', before.user_id)
				.neq('role', 'super_admin');
			if (roleError) throw roleError;
		}
		return { before: before as unknown as Row, data: data as unknown as Row };
	}

	async listTransactionPage(query: TransactionPageQuery) {
		const { data, error } = await this.clients.admin.rpc('list_super_admin_transactions', {
			target_limit: query.limit,
			target_page: query.page,
			target_search: query.search,
			target_status: query.status ?? null,
		});
		if (error) throw error;
		const result = data as { data?: Row[]; total?: number } | null;
		return { data: result?.data ?? [], total: Number(result?.total ?? 0) };
	}

	async listPayouts() {
		const { data, error } = await this.clients.admin
			.from('organizer_payouts')
			.select('*,organizer_id:organizers(id,name,email,payout_status)')
			.order('requested_at', { ascending: false })
			.limit(100);
		if (error) throw error;
		return (data ?? []) as unknown as Row[];
	}

	async getOrganizer(id: string) {
		const { data, error } = await this.clients.admin.from('organizers').select('*').eq('id', id).maybeSingle();
		if (error) throw error;
		return data as unknown as Row | null;
	}

	async getConfiguration() {
		const { data, error } = await this.clients.admin.from('event_configurations').select('*').eq('id', 1).single();
		if (error) throw error;
		return data as unknown as Row;
	}

	async getAvailableBalance(organizerId: string) {
		const { data, error } = await this.clients.admin.rpc('get_organizer_available_balance', {
			target_organizer: organizerId,
		});
		if (error) throw error;
		return Number(data ?? 0);
	}

	async createPayout(input: {
		actorId: string;
		amount: number;
		id: string;
		organizerId: string;
		provider: string;
		providerFee: number;
	}) {
		const { data, error } = await this.clients.admin.rpc('create_organizer_payout', {
			target_actor: input.actorId,
			target_amount: input.amount,
			target_id: input.id,
			target_organizer: input.organizerId,
			target_provider: input.provider,
			target_provider_fee: input.providerFee,
		});
		if (error) throw error;
		return data as unknown as Row;
	}

	async finishPayout(id: string, input: Record<string, unknown>) {
		const { data, error } = await this.clients.admin
			.from('organizer_payouts')
			.update(input)
			.eq('id', id)
			.select('*')
			.single();
		if (error) throw error;
		return data as unknown as Row;
	}

	async failPayout(id: string, failureReason: string, processedAt: string) {
		const { error } = await this.clients.admin
			.from('organizer_payouts')
			.update({ status: 'failed', failure_reason: failureReason.slice(0, 2_000), processed_at: processedAt })
			.eq('id', id);
		if (error) throw error;
	}

	async updateConfiguration(input: Record<string, unknown>) {
		const before = await this.getConfiguration();
		const { data, error } = await this.clients.admin
			.from('event_configurations')
			.update(input)
			.eq('id', 1)
			.select('*')
			.single();
		if (error) throw error;
		return { before, data: data as unknown as Row };
	}

	async recordAudit(input: {
		action: string;
		actorId: string;
		after: unknown;
		before: unknown;
		context: AuditContext;
		resourceId: string | number | null;
		resourceType: string;
	}) {
		const { error } = await this.clients.admin.from('audit_logs').insert({
			actor_id: input.actorId,
			action: input.action,
			resource_type: input.resourceType,
			resource_id: input.resourceId == null ? null : String(input.resourceId),
			before_data: (input.before ?? null) as Json,
			after_data: (input.after ?? null) as Json,
			metadata: { ip: input.context.ip, userAgent: input.context.userAgent },
		});
		if (error) throw error;
	}
}
