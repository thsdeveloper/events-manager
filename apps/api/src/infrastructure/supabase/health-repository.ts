import type { EventSchemaReadiness, HealthRepository } from '../../application/health/check-health.js';
import type { SupabaseClients } from './clients.js';
import { isEventSchemaMigrationError } from '../../shared/errors.js';
export class SupabaseHealthRepository implements HealthRepository {
	constructor(private readonly clients: SupabaseClients) {}
	async isDatabaseAvailable() {
		const { error } = await this.clients.admin.from('site_settings').select('id').limit(1);
		return !error;
	}
	async checkEventSchema(): Promise<EventSchemaReadiness> {
		const required = [
			[
				'events',
				'id,visibility,source_draft_id,cover_image_alt,description_en,description_es,location_tbd,show_map,online_platform,location_street,location_number,location_complement,location_neighborhood,location_city,location_state,location_postal_code',
			],
			['event_drafts', 'id,organizer_id,values,current_step,event_id'],
			['event_ticket_groups', 'id,event_id,title,parent_id,sort'],
			['event_tickets', 'id,group_id,admission_type'],
			['event_configurations', 'platform_fee_percentage,platform_fee_minimum'],
		] as const;
		for (const [table, columns] of required) {
			const { error } = await this.clients.admin.from(table).select(columns).limit(0);
			if (error) return isEventSchemaMigrationError(error) ? 'migration_required' : 'unavailable';
		}
		return 'ready';
	}
}
