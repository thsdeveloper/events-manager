import type { HealthRepository } from '../../application/health/check-health.js';
import type { SupabaseClients } from './clients.js';

export class SupabaseHealthRepository implements HealthRepository {
	constructor(private readonly clients: SupabaseClients) {}

	async isDatabaseAvailable() {
		const { error } = await this.clients.admin.from('site_settings').select('id').limit(1);
		return !error;
	}
}
