export class SupabaseEventCategoryReader {
    clients;
    constructor(clients) {
        this.clients = clients;
    }
    async findById(id) {
        const { data, error } = await this.clients.admin
            .from('event_categories')
            .select('name,description')
            .eq('id', id)
            .maybeSingle();
        if (error)
            throw error;
        return data;
    }
}
//# sourceMappingURL=event-category-reader.js.map