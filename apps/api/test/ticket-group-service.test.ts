import { describe, it, expect, vi } from 'vitest';
import { TicketGroupService, type TicketGroupRepository } from '../src/application/admin/ticket-group-service.js';
import { partialMock } from './support/index.js';
const root = { id: 'g', event_id: 'e', title: 'Pista', parent_id: null, sort: 0 };
function setup() {
	const repo = partialMock<TicketGroupRepository>({
		ownsEvent: vi.fn().mockResolvedValue(true),
		list: vi.fn().mockResolvedValue([root]),
		find: vi.fn().mockResolvedValue(root),
		create: vi.fn().mockResolvedValue({ ...root, id: 'new' }),
		update: vi.fn().mockResolvedValue(root),
		assignedTickets: vi.fn().mockResolvedValue(0),
		remove: vi.fn().mockResolvedValue(true),
		ticketIds: vi.fn().mockResolvedValue(['a', 'b']),
		reorder: vi.fn().mockResolvedValue(undefined),
	});
	return { repo, service: new TicketGroupService(repo) };
}
describe('ticket grouping rules', () => {
	it('creates a subgroup only beneath a root of the same event', async () => {
		const { repo, service } = setup();
		await service.create('org', 'e', { title: 'VIP', parent_id: 'g' });
		expect(repo.create).toHaveBeenCalledWith('e', { title: 'VIP', parent_id: 'g' });
		vi.mocked(repo.find).mockResolvedValue({ ...root, parent_id: 'other' });
		await expect(service.create('org', 'e', { title: 'Too deep', parent_id: 'g' })).rejects.toMatchObject({
			code: 'INVALID_TICKET_GROUP',
		});
	});
	it('rejects a parent from another event', async () => {
		const { repo, service } = setup();
		vi.mocked(repo.find).mockResolvedValue(null);
		await expect(service.create('org', 'e', { title: 'VIP', parent_id: 'x' })).rejects.toMatchObject({
			code: 'INVALID_TICKET_GROUP',
		});
	});
	it('keeps groups with assigned ticket types intact', async () => {
		const { repo, service } = setup();
		vi.mocked(repo.assignedTickets).mockResolvedValue(1);
		await expect(service.remove('org', 'e', 'g')).rejects.toMatchObject({ code: 'TICKET_GROUP_IN_USE' });
		expect(repo.remove).not.toHaveBeenCalled();
	});
	it('does not demote a root with children to a third level', async () => {
		const { repo, service } = setup();
		vi.mocked(repo.list).mockResolvedValue([root, { ...root, id: 'child', parent_id: 'g' }]);
		await expect(service.update('org', 'e', 'g', { parent_id: 'other' })).rejects.toMatchObject({
			code: 'TICKET_GROUP_HAS_CHILDREN',
		});
	});
	it('applies the complete order only to an owned event', async () => {
		const { repo, service } = setup();
		await service.reorder('org', 'e', ['b', 'a']);
		expect(repo.reorder).toHaveBeenCalledWith('e', ['b', 'a']);
		vi.mocked(repo.ownsEvent).mockResolvedValue(false);
		await expect(service.reorder('intruder', 'e', ['b', 'a'])).rejects.toMatchObject({ statusCode: 403 });
	});
	it.each([['a', 'a'], ['a'], ['a', 'foreign']])('rejects incomplete, duplicate or foreign IDs %j', async (...ids) => {
		const { repo, service } = setup();
		await expect(service.reorder('org', 'e', ids)).rejects.toMatchObject({ code: 'INVALID_TICKET_ORDER' });
		expect(repo.reorder).not.toHaveBeenCalled();
	});
	it('updates and removes an unused group', async () => {
		const { repo, service } = setup();
		await service.update('org', 'e', 'g', { title: 'Novo' });
		expect(repo.update).toHaveBeenCalledWith('e', 'g', { title: 'Novo' });
		await service.remove('org', 'e', 'g');
		expect(repo.remove).toHaveBeenCalledWith('e', 'g');
	});
});
