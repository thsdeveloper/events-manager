import { describe, expect, it, vi } from 'vitest';
import type { IamAccess } from '@events-manager/contracts';
import { AuthorizationService, type AuthorizationRepository } from '../src/application/iam/authorization-service.js';
const actor = 'user-a',
	org = 'org-a',
	event = 'event-a';
function fixture(overrides: Partial<IamAccess> = {}) {
	const access: IamAccess = {
		userId: actor,
		organizationId: org,
		active: true,
		isOwner: false,
		permissions: [],
		events: [{ eventId: event, permissions: ['events.read', 'checkin.execute'] }],
		...overrides,
	};
	const repository: AuthorizationRepository = {
		access: vi.fn().mockResolvedValue(access),
		eventOrganization: vi.fn().mockResolvedValue(org),
		recordDenied: vi.fn().mockResolvedValue(undefined),
	};
	return { repository, service: new AuthorizationService(repository), access };
}
describe('IAM authorization', () => {
	it('denies absent permissions and audits the denial', async () => {
		const { service, repository } = fixture();
		await expect(service.require(actor, org, 'finance.read', event)).rejects.toMatchObject({ statusCode: 403 });
		expect(repository.recordDenied).toHaveBeenCalledWith(
			expect.objectContaining({ userId: actor, organizationId: org, action: 'finance.read' }),
		);
	});
	it('allows only the assigned event', async () => {
		const { service } = fixture();
		await expect(service.require(actor, org, 'checkin.execute', event)).resolves.toBeDefined();
		await expect(service.require(actor, org, 'checkin.execute', 'event-b')).rejects.toMatchObject({ statusCode: 403 });
	});
	it('validates event ownership even with organization-wide authority', async () => {
		const { service, repository } = fixture({ permissions: ['events.update'] });
		vi.mocked(repository.eventOrganization).mockResolvedValue('other-org');
		await expect(service.require(actor, org, 'events.update', event)).rejects.toMatchObject({ statusCode: 404 });
	});
	it('rechecks membership so revocation takes effect on the next operation', async () => {
		const { service, repository, access } = fixture();
		await service.require(actor, org, 'events.read', event);
		vi.mocked(repository.access).mockResolvedValue({ ...access, active: false });
		await expect(service.require(actor, org, 'events.read', event)).rejects.toMatchObject({ statusCode: 403 });
	});
	it('does not promote an event permission to organization-wide authority', async () => {
		const { service } = fixture();
		await expect(service.require(actor, org, 'events.read')).rejects.toMatchObject({ statusCode: 403 });
	});
	it('rejects a context resolved for another identity or organization', async () => {
		const { service } = fixture({ userId: 'someone-else', permissions: ['events.read'] });
		await expect(service.require(actor, org, 'events.read')).rejects.toMatchObject({ statusCode: 403 });
	});
});

describe('list and contextual authorization', () => {
	it('intersects all required permissions within the same event', async () => {
		const { service } = fixture({
			events: [
				{ eventId: 'a', permissions: ['finance.read', 'reports.read'] },
				{ eventId: 'b', permissions: ['finance.read'] },
			],
		});
		await expect(service.requireList(actor, org, ['finance.read', 'reports.read'])).resolves.toMatchObject({
			eventIds: ['a'],
		});
	});
	it('does not combine permissions from different events to satisfy a report', async () => {
		const { service } = fixture({
			events: [
				{ eventId: 'a', permissions: ['finance.read'] },
				{ eventId: 'b', permissions: ['reports.read'] },
			],
		});
		await expect(service.requireList(actor, org, ['finance.read', 'reports.read'])).rejects.toMatchObject({
			statusCode: 403,
		});
	});
	it('allows all events only with every organizational grant', async () => {
		const { service } = fixture({ permissions: ['finance.read', 'reports.read'] });
		await expect(service.requireList(actor, org, ['finance.read', 'reports.read'])).resolves.toMatchObject({
			eventIds: null,
		});
	});
	it('checks scope and live identity in the reusable can API', async () => {
		const { service, repository } = fixture();
		await expect(
			service.can({ userId: actor, action: 'events.read', resource: { organizationId: org, eventId: event } }),
		).resolves.toBe(true);
		await expect(
			service.can({ userId: actor, action: 'events.read', resource: { organizationId: org } }),
		).resolves.toBe(false);
		vi.mocked(repository.eventOrganization).mockResolvedValue('foreign');
		await expect(
			service.can({ userId: actor, action: 'events.read', resource: { organizationId: org, eventId: event } }),
		).resolves.toBe(false);
		vi.mocked(repository.access).mockResolvedValue(null as never);
		await expect(service.context(actor, org)).resolves.toBeNull();
	});
});
