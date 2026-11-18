import { describe, expect, it, vi } from 'vitest';
import { SupabaseIamRepository, iamDatabaseError } from '../src/infrastructure/supabase/iam-repository.js';
import { createSupabaseClientsStub } from './support/index.js';
describe('IAM persistence boundary', () => {
	it('audits denied privilege escalation after the mutation transaction rolls back, without secrets', async () => {
		const { clients, from } = createSupabaseClientsStub({ rpc: { error: { message: 'IAM_CANNOT_DELEGATE' } } });
		const insert = vi.fn().mockResolvedValue({ error: null });
		from.mockImplementation(() => ({ insert }));
		await expect(
			new SupabaseIamRepository(clients).mutate('actor', 'org', 'invitations.create', {
				tokenHash: 'sensitive',
				email: 'private@test.com',
			}),
		).rejects.toMatchObject({ statusCode: 403 });
		expect(insert).toHaveBeenCalledWith(
			expect.objectContaining({
				actor_id: 'actor',
				organization_id: 'org',
				action: 'iam.access.denied',
				metadata: { operation: 'invitations.create', reason: 'IAM_CANNOT_DELEGATE' },
			}),
		);
		expect(JSON.stringify(insert.mock.calls)).not.toContain('sensitive');
		expect(JSON.stringify(insert.mock.calls)).not.toContain('private@test.com');
	});
	it('audits invitation identity mismatch without recording the invitation token', async () => {
		const { clients, from } = createSupabaseClientsStub({ rpc: { error: { message: 'IAM_INVITATION_IDENTITY' } } });
		const insert = vi.fn().mockResolvedValue({ error: null });
		from.mockImplementation(() => ({ insert }));
		await expect(new SupabaseIamRepository(clients).accept('actor', 'sensitive-token-hash')).rejects.toMatchObject({
			statusCode: 403,
		});
		expect(insert).toHaveBeenCalledWith(
			expect.objectContaining({
				actor_id: 'actor',
				action: 'iam.access.denied',
				metadata: { operation: 'invitations.accept', reason: 'IAM_INVITATION_IDENTITY' },
			}),
		);
		expect(JSON.stringify(insert.mock.calls)).not.toContain('sensitive');
	});
	it.each(['IAM_PERMISSION_DENIED', 'IAM_CANNOT_DELEGATE', 'IAM_INVITATION_IDENTITY', 'IAM_MEMBER_SUSPENDED'])(
		'maps %s to a forbidden problem',
		(message) => {
			expect(() => iamDatabaseError({ message })).toThrow();
			try {
				iamDatabaseError({ message });
			} catch (error) {
				expect(error).toMatchObject({ statusCode: 403 });
			}
		},
	);
});
