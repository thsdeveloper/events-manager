import type { Database } from '@events-manager/contracts';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { RateLimitRepository } from '../../application/security/rate-limit.js';

export class SupabaseRateLimitRepository implements RateLimitRepository {
	constructor(private readonly database: SupabaseClient<Database>) {}

	async consume(input: { key: string; limit: number; windowSeconds: number }) {
		const { data, error } = await this.database.rpc('consume_api_rate_limit', {
			target_key: input.key,
			target_limit: input.limit,
			target_window_seconds: input.windowSeconds,
		});
		if (error) throw error;
		return data;
	}
}
