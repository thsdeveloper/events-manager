import { organizerDashboardSchema } from '@events-manager/contracts';
export class SupabaseOrganizerDashboardRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async getByOrganizerId(organizerId) {
        const { data, error } = await this.database.rpc('get_organizer_dashboard', {
            target_organizer: organizerId,
        });
        if (error)
            throw error;
        return organizerDashboardSchema.parse(data);
    }
}
//# sourceMappingURL=organizer-dashboard-repository.js.map