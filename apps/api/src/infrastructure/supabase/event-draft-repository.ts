import type { EventDraftInput, EventDraftSnapshot } from '@events-manager/contracts';
import type { EventDraftRepository } from '../../application/events/event-draft-service.js';
import { ApiError } from '../../shared/errors.js';
import type { SupabaseClients } from './clients.js';
import { resolveEventOrganizer } from './event-repository.js';

export class SupabaseEventDraftRepository implements EventDraftRepository {
	constructor(
		private readonly clients: SupabaseClients,
		private readonly preferredOrganizerId?: string,
		private readonly strictPreference = false,
	) {}
	private async organizer(userId: string, prepare = false) {
		const organizer = await resolveEventOrganizer(
			this.clients,
			userId,
			this.preferredOrganizerId,
			this.strictPreference,
		);
		if (!organizer || (prepare && !['active', 'pending'].includes(organizer.status)))
			throw new ApiError('Seu perfil de organizador não permite preparar eventos.', 403, 'ORGANIZER_REQUIRED');
		return organizer;
	}
	async listForUser(userId: string) {
		const organizer = await this.organizer(userId);
		const { data, error } = await this.clients.admin
			.from('event_drafts')
			.select('*')
			.eq('organizer_id', organizer.id)
			.is('event_id', null)
			.order('date_updated', { ascending: false });
		if (error) throw error;
		return (data ?? []) as unknown as EventDraftSnapshot[];
	}
	async findForUser(userId: string, id: string) {
		const organizer = await this.organizer(userId);
		const { data, error } = await this.clients.admin
			.from('event_drafts')
			.select('*')
			.eq('id', id)
			.eq('organizer_id', organizer.id)
			.maybeSingle();
		if (error) throw error;
		return data as unknown as EventDraftSnapshot | null;
	}
	async createForUser(userId: string, input: EventDraftInput) {
		const organizer = await this.organizer(userId, true);
		const { data, error } = await this.clients.admin
			.from('event_drafts')
			.insert({ organizer_id: organizer.id, values: input.values, current_step: input.current_step })
			.select('*')
			.single();
		if (error) throw error;
		return data as unknown as EventDraftSnapshot;
	}
	async updateForUser(userId: string, id: string, input: EventDraftInput) {
		const organizer = await this.organizer(userId, true);
		const { data, error } = await this.clients.admin
			.from('event_drafts')
			.update({ values: input.values, current_step: input.current_step, date_updated: new Date().toISOString() })
			.eq('id', id)
			.eq('organizer_id', organizer.id)
			.is('event_id', null)
			.select('*')
			.maybeSingle();
		if (error) throw error;
		return data as unknown as EventDraftSnapshot | null;
	}
	async deleteForUser(userId: string, id: string) {
		const organizer = await this.organizer(userId);
		const { count, error } = await this.clients.admin
			.from('event_drafts')
			.delete({ count: 'exact' })
			.eq('id', id)
			.eq('organizer_id', organizer.id)
			.is('event_id', null);
		if (error) throw error;
		return Boolean(count);
	}
	async completeForUser(userId: string, id: string, eventId: string) {
		const organizer = await this.organizer(userId, true);
		const { data, error } = await this.clients.admin
			.from('event_drafts')
			.update({ event_id: eventId, date_updated: new Date().toISOString() })
			.eq('id', id)
			.eq('organizer_id', organizer.id)
			.is('event_id', null)
			.select('id')
			.maybeSingle();
		if (error) throw error;
		return Boolean(data);
	}
}
