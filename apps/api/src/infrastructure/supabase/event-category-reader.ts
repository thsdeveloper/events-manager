import type { EventCategoryReader, EventCategorySummary } from '../../application/external/external-service.js';
import type { SupabaseClients } from './clients.js';

export class SupabaseEventCategoryReader implements EventCategoryReader {
	constructor(private readonly clients: SupabaseClients) {}

	async findById(id: string): Promise<EventCategorySummary | null> {
		const { data, error } = await this.clients.admin
			.from('event_categories')
			.select('name,description')
			.eq('id', id)
			.maybeSingle();
		if (error) throw error;
		return data;
	}
}
