export class SupabaseRateLimitRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async consume(input) {
        const { data, error } = await this.database.rpc('consume_api_rate_limit', {
            target_key: input.key,
            target_limit: input.limit,
            target_window_seconds: input.windowSeconds,
        });
        if (error)
            throw error;
        return data;
    }
}
//# sourceMappingURL=rate-limit-repository.js.map