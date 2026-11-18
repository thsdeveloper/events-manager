import type { OrganizerDashboard } from '@events-manager/contracts';

export interface OrganizerDashboardRepository {
	getByOrganizerId(organizerId: string, eventId?: string): Promise<OrganizerDashboard>;
}

export class GetOrganizerDashboard {
	constructor(private readonly repository: OrganizerDashboardRepository) {}

	execute(organizerId: string, eventId?: string) {
		return eventId
			? this.repository.getByOrganizerId(organizerId, eventId)
			: this.repository.getByOrganizerId(organizerId);
	}
}
