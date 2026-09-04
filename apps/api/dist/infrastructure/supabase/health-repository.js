export class SupabaseHealthRepository {
    clients;
    constructor(clients) {
        this.clients = clients;
    }
    async isDatabaseAvailable() {
        const { error } = await this.clients.admin.from('site_settings').select('id').limit(1);
        return !error;
    }
}
//# sourceMappingURL=health-repository.js.map