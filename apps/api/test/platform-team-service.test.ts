import { describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import {
	PlatformTeamService as TeamService,
	type PlatformTeamRepository as TeamRepository,
} from '../src/application/iam/platform-team-service.js';
import type { InvitationMailer } from '../src/application/iam/team-service.js';
import { partialMock } from './support/index.js';
function fixture(fails = false) {
	const repository = partialMock<TeamRepository>({
		mutate: vi.fn().mockResolvedValue({ id: 'invitation', email: 'a@example.test', expires_at: '2026-12-01' }),
		accept: vi.fn().mockResolvedValue({ organizationId: 'org', memberId: 'member' }),
	});
	const mailer: InvitationMailer = {
		send: fails ? vi.fn().mockRejectedValue(new Error('SMTP unavailable')) : vi.fn().mockResolvedValue(undefined),
	};
	return { repository, mailer, service: new TeamService(repository, mailer, 'https://flouvi.example') };
}
describe('team invitations', () => {
	it('stores only the token hash and sends an unguessable fragment link', async () => {
		const { repository, mailer, service } = fixture();
		const result = await service.invite('actor', {
			email: 'a@example.test',
			assignments: [{ roleId: 'role', eventId: null }],
		});
		const notice = vi.mocked(mailer.send).mock.calls[0][0];
		const url = new URL(notice.url);
		const token = new URLSearchParams(url.hash.slice(1)).get('token')!;
		expect(url.pathname).toBe('/convites/plataforma');
		expect(url.search).toBe('');
		expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
		expect(repository.mutate).toHaveBeenCalledWith(
			'actor',
			'invitations.create',
			expect.objectContaining({ tokenHash: createHash('sha256').update(token).digest('hex') }),
		);
		expect(JSON.stringify(result)).not.toContain(token);
		expect(result).toMatchObject({ delivery: 'sent' });
	});
	it('does not send an email if the database rejects delegation', async () => {
		const { repository, mailer, service } = fixture();
		vi.mocked(repository.mutate).mockRejectedValue(new Error('IAM_CANNOT_DELEGATE'));
		await expect(service.invite('actor', { email: 'a@example.test', assignments: [] })).rejects.toThrow(
			'IAM_CANNOT_DELEGATE',
		);
		expect(mailer.send).not.toHaveBeenCalled();
	});
	it('reports failed delivery without pretending that an email was sent', async () => {
		const { service } = fixture(true);
		await expect(service.invite('actor', { email: 'a@example.test', assignments: [] })).resolves.toMatchObject({
			delivery: 'failed',
			invitation: { id: 'invitation' },
		});
	});
	it('hashes the token before asking the database to accept it', async () => {
		const { service, repository } = fixture();
		await service.accept('actor', 'secret-token');
		expect(repository.accept).toHaveBeenCalledWith('actor', createHash('sha256').update('secret-token').digest('hex'));
	});
});
