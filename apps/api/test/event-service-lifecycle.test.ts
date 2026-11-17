import { describe, expect, it, vi } from 'vitest';
import {
	EventService,
	type EventRepository,
	type EventTicketCreator,
	type EventGroupCreator,
} from '../src/application/events/event-service.js';
import type { EventDraftRepository } from '../src/application/events/event-draft-service.js';
import { partialMock, TEST_EVENT_ID, TEST_USER_ID } from './support/index.js';
const ORG = '00000000-0000-4000-8000-000000000002';
describe('event publication and live ticket prices', () => {
	it('keeps legacy ticket projections without prices usable without a fee lookup', async () => {
		const repository = partialMock<EventRepository>({
			findPublicBySlug: vi
				.fn()
				.mockResolvedValue({ id: TEST_EVENT_ID, tickets: [{ id: 'unpriced', sort: 2 }, 'legacy-id'] }),
		});
		const event = await new EventService(repository).getPublicBySlug('encontro');
		expect(event.tickets).toEqual([{ id: 'unpriced', sort: 2 }, 'legacy-id']);
	});

	it('recomputes displayed prices from current platform fees instead of a stale stored estimate', async () => {
		const repository = partialMock<EventRepository>({
			findPublicBySlug: vi.fn().mockResolvedValue({
				id: TEST_EVENT_ID,
				tickets: [
					{ id: 'paid', sort: 0, price: 50, buyer_price: 51, service_fee_type: 'passed_to_buyer' },
					{ id: 'absorbed', sort: 1, price: 50, buyer_price: 51, service_fee_type: 'absorbed' },
					{ id: 'free', sort: 2, price: 0, buyer_price: 1, service_fee_type: 'passed_to_buyer' },
				],
			}),
			getFeeConfiguration: vi.fn().mockResolvedValue({ platform_fee_percentage: 5, platform_fee_minimum: 10 }),
		});
		const event = await new EventService(repository).getPublicBySlug('encontro');
		expect(event.tickets).toMatchObject([
			{ id: 'paid', buyer_price: 60 },
			{ id: 'absorbed', buyer_price: 50 },
			{ id: 'free', buyer_price: 0 },
		]);
	});
	it('creates groups before assigning their permanent identities to tickets and publishes only after setup', async () => {
		let visibleStatus: string | undefined;
		const repository = partialMock<EventRepository>({
			canPublishForUser: vi.fn().mockResolvedValue(true),
			createForUser: vi.fn(async (_user: string, input: { status?: string }) => {
				visibleStatus = input.status;
				return { id: TEST_EVENT_ID, organizer_id: ORG, status: input.status } as never;
			}),
			updateForUser: vi.fn(async (_user: string, _id: string, patch: { status?: string }) => {
				visibleStatus = patch.status;
				return { id: TEST_EVENT_ID, organizer_id: ORG, status: patch.status } as never;
			}),
			deleteForUser: vi.fn().mockResolvedValue(true),
		});
		const groups: EventGroupCreator = {
			create: vi.fn(async () => {
				expect(visibleStatus).toBe('draft');
				return { client_group: 'stored_group' };
			}),
		};
		const tickets: EventTicketCreator = {
			create: vi.fn(async () => {
				expect(visibleStatus).toBe('draft');
			}),
		};
		const event = await new EventService(repository, tickets, undefined, groups).create(TEST_USER_ID, {
			title: 'Encontro',
			status: 'published',
			tickets: [{ title: 'Inteira', group_id: 'client_group' }],
			ticket_groups: [{ client_id: 'client_group', title: 'Pista' }],
		} as never);
		expect(tickets.create).toHaveBeenCalledWith(
			ORG,
			expect.objectContaining({ event_id: TEST_EVENT_ID, group_id: 'stored_group' }),
		);
		expect(event.status).toBe('published');
		expect((repository.createForUser as ReturnType<typeof vi.fn>).mock.calls[0][1]).not.toHaveProperty('ticket_groups');
	});
});

describe('snapshot conversion recovery', () => {
	const draftId = '00000000-0000-4000-8000-000000000030';
	const input = { title: 'Encontro', status: 'published', is_free: true, tickets: [], draft_id: draftId };
	function conversion(
		options: { completion?: false | 'error'; publishError?: boolean; publishCommitted?: boolean } = {},
	) {
		let event: Record<string, unknown> | null = null;
		const snapshot = { id: draftId, organizer_id: ORG, event_id: null as string | null };
		const repository = partialMock<EventRepository>({
			canPublishForUser: vi.fn().mockResolvedValue(true),
			createForUser: vi.fn(
				async (_user: string, stored: Record<string, unknown>) =>
					(event = { ...stored, id: TEST_EVENT_ID, organizer_id: ORG }),
			),
			findForUser: vi.fn(async () => event),
			updateForUser: vi.fn(async (_user: string, _id: string, patch: Record<string, unknown>) => {
				if (options.publishError) {
					if (options.publishCommitted) Object.assign(event!, patch);
					throw new Error('publication response lost');
				}
				Object.assign(event!, patch);
				return event;
			}),
			deleteForUser: vi.fn(async () => {
				event = null;
				snapshot.event_id = null;
				return true;
			}),
		});
		const drafts = partialMock<EventDraftRepository>({
			findForUser: vi.fn(async () => snapshot),
			completeForUser: vi.fn(async () => {
				if (options.completion === 'error') throw new Error('snapshot save failed');
				if (options.completion === false) return false;
				snapshot.event_id = TEST_EVENT_ID;
				return true;
			}),
		});
		return { repository, drafts, snapshot, service: new EventService(repository, undefined, drafts) };
	}
	it.each([false, 'error'] as const)('never publishes if linking the snapshot fails with %s', async (completion) => {
		const { service, repository, drafts } = conversion({ completion });
		await expect(service.create(TEST_USER_ID, input as never)).rejects.toThrow();
		expect(drafts.completeForUser).toHaveBeenCalledOnce();
		expect(repository.updateForUser).not.toHaveBeenCalled();
		expect(repository.createForUser).toHaveBeenCalledWith(TEST_USER_ID, expect.objectContaining({ status: 'draft' }));
		expect(repository.deleteForUser).toHaveBeenCalledWith(TEST_USER_ID, TEST_EVENT_ID);
	});
	it('links a free event snapshot before its first publication', async () => {
		const { service, repository, drafts } = conversion();
		const result = await service.create(TEST_USER_ID, input as never);
		expect(repository.createForUser).toHaveBeenCalledWith(TEST_USER_ID, expect.objectContaining({ status: 'draft' }));
		expect(vi.mocked(drafts.completeForUser).mock.invocationCallOrder[0]).toBeLessThan(
			vi.mocked(repository.updateForUser).mock.invocationCallOrder[0],
		);
		expect(result.status).toBe('published');
	});
	it.each([false, true])(
		'retains the linked event after uncertain publication (committed=%s) and returns its actual state on retry',
		async (publishCommitted) => {
			const { service, repository, snapshot, drafts } = conversion({ publishError: true, publishCommitted });
			await expect(service.create(TEST_USER_ID, input as never)).rejects.toThrow('publication response lost');
			expect(snapshot.event_id).toBe(TEST_EVENT_ID);
			expect(repository.deleteForUser).not.toHaveBeenCalled();
			const result = await service.create(TEST_USER_ID, input as never);
			expect(result.status).toBe(publishCommitted ? 'published' : 'draft');
			expect(repository.createForUser).toHaveBeenCalledOnce();
			expect(repository.updateForUser).toHaveBeenCalledOnce();
			expect(drafts.completeForUser).toHaveBeenCalledOnce();
		},
	);
});
