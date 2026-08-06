export interface HealthRepository {
	isDatabaseAvailable(): Promise<boolean>;
}

export class CheckHealth {
	constructor(private readonly repository: HealthRepository) {}

	async execute() {
		const connected = await this.repository.isDatabaseAvailable();
		return { status: connected ? 'ok' : 'degraded', database: connected ? 'connected' : 'unavailable' };
	}
}
