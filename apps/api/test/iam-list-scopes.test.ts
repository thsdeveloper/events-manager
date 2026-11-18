import { describe, expect, it } from 'vitest';
import { SupabaseAdminRepository } from '../src/infrastructure/supabase/admin-repository.js';
import { SupabaseFinanceRepository } from '../src/infrastructure/supabase/finance-repository.js';
import { SupabaseEventRepository } from '../src/infrastructure/supabase/event-repository.js';
import { createSupabaseClientsStub } from './support/index.js';
describe('IAM list scopes', () => {
	it('filters participant and ticket event options to authorized events', async () => {
		const { clients } = createSupabaseClientsStub({
			tables: {
				events: {
					data: [
						{ id: 'a', title: 'A' },
						{ id: 'b', title: 'B' },
					],
				},
			},
		});
		const repo = new SupabaseAdminRepository(clients, ['a']);
		expect(await repo.listOwnedEventIds('org')).toEqual(['a']);
		expect(await repo.listEventOptions('org')).toEqual([{ id: 'a', title: 'A' }]);
	});
	it('never treats an empty allowed scope as all events', async () => {
		const { clients } = createSupabaseClientsStub({ tables: { events: { data: [{ id: 'a' }] } } });
		expect(await new SupabaseAdminRepository(clients, []).listOwnedEventIds('org')).toEqual([]);
	});
	it('filters financial rows before any revenue aggregation', async () => {
		const { clients } = createSupabaseClientsStub({
			tables: {
				event_registrations: {
					data: [
						{ id: 'r1', event_id: { id: 'a' }, total_amount: 20 },
						{ id: 'r2', event_id: { id: 'b' }, total_amount: 200 },
					],
				},
				events: { data: [{ id: 'a' }, { id: 'b' }] },
			},
		});
		const repo = new SupabaseFinanceRepository(clients, ['a']);
		expect((await repo.listRegistrations('org')).map((r) => r.id)).toEqual(['r1']);
		expect((await repo.listEvents('org')).map((r) => r.id)).toEqual(['a']);
	});
	it('returns only permitted events in the organizer listing', async () => {
		const { clients } = createSupabaseClientsStub({
			tables: { organizers: { data: [{ id: 'org', status: 'active' }] }, events: { data: [{ id: 'a' }, { id: 'b' }] } },
		});
		expect(
			(await new SupabaseEventRepository(clients, 'org', true, ['a']).listForUser('user')).map((e) => e.id),
		).toEqual(['a']);
	});
});
