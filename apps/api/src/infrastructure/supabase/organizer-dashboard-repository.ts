import { organizerDashboardSchema, type Database, type OrganizerDashboard } from '@events-manager/contracts';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { OrganizerDashboardRepository } from '../../application/dashboard/get-organizer-dashboard.js';

export class SupabaseOrganizerDashboardRepository implements OrganizerDashboardRepository {
	constructor(private readonly database: SupabaseClient<Database>) {}

	async getByOrganizerId(organizerId: string): Promise<OrganizerDashboard> {
		const { data, error } = await this.database.rpc('get_organizer_dashboard', {
			target_organizer: organizerId,
		});

		if (error) throw error;

		return organizerDashboardSchema.parse(data);
	}
}
