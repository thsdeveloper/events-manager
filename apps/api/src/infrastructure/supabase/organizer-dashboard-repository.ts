import { organizerDashboardSchema, type Database, type OrganizerDashboard } from '@events-manager/contracts';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { OrganizerDashboardRepository } from '../../application/dashboard/get-organizer-dashboard.js';

export class SupabaseOrganizerDashboardRepository implements OrganizerDashboardRepository {
	constructor(
		private readonly database: SupabaseClient<Database>,
		private readonly allowedEventIds: string[] | null = null,
	) {}

	async getByOrganizerId(organizerId: string, eventId?: string): Promise<OrganizerDashboard> {
		if (this.allowedEventIds !== null) {
			const ids = this.allowedEventIds.filter((id) => !eventId || eventId === id);
			const { data, error } = await this.database.rpc('get_iam_dashboard', {
				target_organizer: organizerId,
				allowed_events: ids,
			});
			if (error) throw error;
			return organizerDashboardSchema.parse(data);
		}
		const { data, error } = await this.database.rpc('get_organizer_dashboard', {
			target_organizer: organizerId,
			...(eventId ? { target_event: eventId } : {}),
		});

		if (error) throw error;

		return organizerDashboardSchema.parse(data);
	}
}
