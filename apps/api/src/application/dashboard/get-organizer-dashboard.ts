import type { OrganizerDashboard } from '@events-manager/contracts';

export interface OrganizerDashboardRepository {
	getByOrganizerId(organizerId: string): Promise<OrganizerDashboard>;
}

export class GetOrganizerDashboard {
	constructor(private readonly repository: OrganizerDashboardRepository) {}

	execute(organizerId: string) {
		return this.repository.getByOrganizerId(organizerId);
	}
}
