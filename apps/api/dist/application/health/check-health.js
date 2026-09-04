export class CheckHealth {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async execute() {
        const connected = await this.repository.isDatabaseAvailable();
        return { status: connected ? 'ok' : 'degraded', database: connected ? 'connected' : 'unavailable' };
    }
}
//# sourceMappingURL=check-health.js.map