import type { EventPageLayout } from '@events-manager/contracts';
import type { EventPageRepository, EventPageRow } from '../../application/events/event-page-service.js';
import type { SupabaseClients } from './clients.js';

const columns = 'event_id,enabled,draft,published,published_at,date_updated';

export class SupabaseEventPageRepository implements EventPageRepository {
	constructor(private readonly clients: SupabaseClients) {}

	async find(eventId: string) {
		const { data, error } = await this.clients.admin
			.from('event_pages')
			.select(columns)
			.eq('event_id', eventId)
			.maybeSingle();
		if (error) throw error;

		return data ? toRow(data) : null;
	}

	async upsert(eventId: string, patch: Partial<Omit<EventPageRow, 'event_id' | 'date_updated'>>) {
		const { data, error } = await this.clients.admin
			.from('event_pages')
			.upsert({ event_id: eventId, ...patch } as never, { onConflict: 'event_id' })
			.select(columns)
			.single();
		if (error) throw error;

		return toRow(data);
	}
}

function toRow(data: Record<string, unknown>): EventPageRow {
	return {
		event_id: String(data.event_id),
		enabled: Boolean(data.enabled),
		draft: data.draft as EventPageLayout,
		published: (data.published as EventPageLayout | null) ?? null,
		published_at: (data.published_at as string | null) ?? null,
		date_updated: String(data.date_updated),
	};
}
