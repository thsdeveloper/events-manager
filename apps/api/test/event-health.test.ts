import { describe, expect, it } from 'vitest';
import { CheckHealth } from '../src/application/health/check-health.js';
import { SupabaseHealthRepository } from '../src/infrastructure/supabase/health-repository.js';
import { eventMemory } from './support/event-memory.js';
describe('event schema readiness', () => {
	it.each([
		{ events: { code: 'PGRST204', message: "Could not find the 'visibility' column of 'events' in the schema cache" } },
		{
			event_drafts: { code: 'PGRST205', message: "Could not find the table 'public.event_drafts' in the schema cache" },
		},
	])('reports an expected missing event migration while distinguishing database connectivity (%o)', async (errors) => {
		const memory = eventMemory({ errors });
		const result = await new CheckHealth(new SupabaseHealthRepository(memory.clients)).execute();
		expect(result).toMatchObject({ status: 'degraded', database: 'connected', schema: 'migration_required' });
	});
	it('does not describe a network failure as a missing migration', async () => {
		const memory = eventMemory({ errors: { events: { message: 'fetch failed' } } });
		const result = await new CheckHealth(new SupabaseHealthRepository(memory.clients)).execute();
		expect(result).toMatchObject({ status: 'degraded', database: 'unavailable', schema: 'unavailable' });
	});
	it('preserves the healthy API response when the complete schema is available', async () => {
		const memory = eventMemory();
		expect(await new CheckHealth(new SupabaseHealthRepository(memory.clients)).execute()).toEqual({
			status: 'ok',
			database: 'connected',
		});
	});
});
