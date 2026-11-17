export type EventSchemaReadiness = 'ready' | 'migration_required' | 'unavailable';
export interface HealthRepository {
	isDatabaseAvailable(): Promise<boolean>;
	checkEventSchema?(): Promise<EventSchemaReadiness>;
}
export class CheckHealth {
	constructor(private readonly repository: HealthRepository) {}
	async execute() {
		const connected = await this.repository.isDatabaseAvailable();
		if (!connected) return { status: 'degraded', database: 'unavailable' };
		const schema = await this.repository.checkEventSchema?.();
		if (schema === 'migration_required') return { status: 'degraded', database: 'connected', schema };
		if (schema === 'unavailable') return { status: 'degraded', database: 'unavailable', schema };
		return { status: 'ok', database: 'connected' };
	}
}
