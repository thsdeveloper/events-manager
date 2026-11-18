import { describe, expect, it } from 'vitest';
import { SupabaseAuthRepository } from '../src/infrastructure/supabase/auth-repository.js';
import { resolveEventOrganizer } from '../src/infrastructure/supabase/event-repository.js';
import { createSupabaseClientsStub } from './support/index.js';
const user = '11111111-1111-4111-8111-111111111111',
	org = '22222222-2222-4222-8222-222222222222';
describe('IAM workspace membership', () => {
	it('offers active member workspaces without exposing bank or verification data', async () => {
		const { clients } = createSupabaseClientsStub({
			tables: {
				organizers: { data: [] },
				organization_members: {
					data: [
						{ organization: { id: org, name: 'Team', status: 'active', payout_pix_key: 'secret', document: 'secret' } },
					],
				},
			},
		});
		const rows = await new SupabaseAuthRepository(clients).listOrganizers(user);
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({ id: org, name: 'Team' });
		expect(rows[0]).not.toHaveProperty('payout_pix_key');
		expect(rows[0]).not.toHaveProperty('document');
	});
	it('resolves event repositories using membership as well as ownership', async () => {
		const { clients } = createSupabaseClientsStub({
			tables: {
				organizers: { data: [] },
				organization_members: { data: [{ organization: { id: org, name: 'Team', status: 'active' } }] },
			},
		});
		expect(await resolveEventOrganizer(clients, user, org, true)).toMatchObject({ id: org });
	});
});
