import type { OrganizerInput, OrganizerRepository } from '../../application/organizers/organizer-service.js';
import type { SupabaseClients } from './clients.js';

export class SupabaseOrganizerRepository implements OrganizerRepository {
	constructor(private readonly clients: SupabaseClients) {}

	async findById(organizerId: string) {
		const { data, error } = await this.clients.admin
			.from('organizers')
			.select('*,logo:media_files(*)')
			.eq('id', organizerId)
			.maybeSingle();
		if (error) throw error;
		return data;
	}

	async create(userId: string, input: OrganizerInput, status: 'active' | 'pending') {
		const { data, error } = await this.clients.admin.rpc('create_organizer_profile', {
			target_user: userId,
			target_name: input.name ?? '',
			target_email: input.email,
			target_phone: input.phone ?? null,
			target_description: input.description ?? null,
			target_website: input.website ?? null,
			target_document: input.document ?? null,
			target_logo: input.logo ?? null,
			target_status: status,
		});
		if (error) throw error;
		return data ? (data as Record<string, unknown>) : ('exists' as const);
	}

	async existsForUser(userId: string) {
		const { count, error } = await this.clients.admin
			.from('organizers')
			.select('id', { count: 'exact', head: true })
			.eq('user_id', userId);
		if (error) throw error;
		return (count ?? 0) > 0;
	}

	async findByDocument(document: string) {
		const { data, error } = await this.clients.admin
			.from('organizers')
			.select('id,user_id')
			.eq('document', document)
			.limit(1)
			.maybeSingle();
		if (error) throw error;
		return data as { id: string; user_id: string } | null;
	}

	// Keyed by organization, not by user: a user may own several, and filtering by
	// user_id would write the same values into every one of them.
	async updateById(organizerId: string, input: Partial<OrganizerInput>) {
		const { data, error } = await this.clients.admin
			.from('organizers')
			.update(input)
			.eq('id', organizerId)
			.select('*')
			.maybeSingle();
		if (error) throw error;
		return data;
	}

	async setLogo(organizerId: string, mediaId: string) {
		const { data, error } = await this.clients.admin
			.from('organizers')
			.update({ logo: mediaId })
			.eq('id', organizerId)
			.select('*,logo:media_files(*)')
			.single();
		if (error) throw error;
		return data;
	}

	async stats(organizerId: string) {
		const { data: events, error } = await this.clients.admin
			.from('events')
			.select('id')
			.eq('organizer_id', organizerId);
		if (error) throw error;
		const eventIds = (events ?? []).map((event) => event.id);
		if (!eventIds.length) return { totalEvents: 0, totalRegistrations: 0, totalRevenue: 0 };
		const { data: registrations, error: registrationsError } = await this.clients.admin
			.from('event_registrations')
			.select('payment_amount,payment_status')
			.in('event_id', eventIds);
		if (registrationsError) throw registrationsError;
		return {
			totalEvents: eventIds.length,
			totalRegistrations: registrations?.length ?? 0,
			totalRevenue: (registrations ?? [])
				.filter((item) => item.payment_status === 'paid')
				.reduce((sum, item) => sum + Number(item.payment_amount ?? 0), 0),
		};
	}

	async updatePayout(
		organizerId: string,
		input: { payout_pix_key: string; payout_pix_key_type: 'CPF' | 'CNPJ' | 'PHONE' | 'EMAIL' | 'RANDOM' },
	) {
		const { data, error } = await this.clients.admin
			.from('organizers')
			.update({ ...input, payout_status: 'pending_review' })
			.eq('id', organizerId)
			.select('*')
			.single();
		if (error) throw error;
		return data;
	}
}
