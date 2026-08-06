export class GetOrganizerDashboard {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    execute(organizerId) {
        return this.repository.getByOrganizerId(organizerId);
    }
}
//# sourceMappingURL=get-organizer-dashboard.js.map