import { it, expect, vi } from 'vitest';
import { SupabasePaymentRepository } from '../src/infrastructure/supabase/payment-repository.js';
import type { SupabaseClients } from '../src/infrastructure/supabase/clients.js';
it('never settles a manual transfer through a provider webhook without its manual receipt workflow', async () => {
	const payout: Record<string, unknown> = {
		id: '10000000-0000-4000-8000-000000000001',
		provider: 'manual',
		provider_payout_id: null,
		status: 'pending',
	};
	const from = vi.fn(() => {
		let patch: Record<string, unknown> = {};
		const filters: Array<() => boolean> = [];
		const query = {
			update(input: Record<string, unknown>) {
				patch = input;
				return query;
			},
			eq(key: string, value: unknown) {
				filters.push(() => payout[key] === value);
				return query;
			},
			neq(key: string, value: unknown) {
				filters.push(() => payout[key] !== value);
				return query;
			},
			select() {
				return query;
			},
			then(resolve: (v: unknown) => unknown) {
				const match = filters.every((f) => f());
				if (match) Object.assign(payout, patch);
				return Promise.resolve(resolve({ data: match ? [{ id: payout.id }] : [], error: null }));
			},
		};
		return query;
	});
	const repo = new SupabasePaymentRepository({ admin: { from } } as unknown as SupabaseClients);
	await repo.updatePayoutForWebhook('unrelated-provider', String(payout.id), { status: 'completed' });
	expect(payout.status).toBe('pending');
});
