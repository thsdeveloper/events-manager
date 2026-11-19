/**
 * Página exclusiva do evento: rascunho e publicação.
 *
 * O organizador parte de um layout montado a partir do próprio evento, edita o
 * rascunho quantas vezes quiser e só a publicação troca o que o público vê. A
 * publicação exige a seção de ingressos e âncoras coerentes; o HTML das seções
 * de texto é sanitizado ao salvar.
 */
import { describe, expect, it, vi } from 'vitest';
import { buildDefaultEventPageLayout, type EventPageLayout } from '@events-manager/contracts';
import {
	EventPageService,
	type EventPageRepository,
	type EventPageRow,
	type OwnedEventReader,
} from '../src/application/events/event-page-service.js';
import { partialMock, TEST_EVENT_ID, TEST_USER_ID } from './support/index.js';

const event = {
	id: TEST_EVENT_ID,
	title: 'Congresso',
	description: '<p>Três dias.</p>',
	short_description: 'Encontro anual.',
	cover_image: { id: '00000000-0000-4000-8000-000000000051' },
	start_date: '2026-09-19T12:00:00.000Z',
};

function build(row: EventPageRow | null = null) {
	const rows: EventPageRow[] = [];
	const repository = partialMock<EventPageRepository>({
		find: vi.fn().mockResolvedValue(row),
		disable: vi.fn().mockResolvedValue(row ? { ...row, enabled: false } : null),
		upsert: vi.fn(async (eventId: string, patch: Partial<EventPageRow>) => {
			if (!patch.draft) throw new Error('null value in column "draft" violates not-null constraint');
			const saved = {
				event_id: eventId,
				enabled: false,
				draft: patch.draft ?? row?.draft ?? null,
				published: null,
				published_at: null,
				date_updated: '2026-09-17T12:00:00.000Z',
				...row,
				...patch,
			} as EventPageRow;
			rows.push(saved);

			return saved;
		}),
	});
	const events = partialMock<OwnedEventReader>({ getForUser: vi.fn().mockResolvedValue(event) });
	const service = new EventPageService(repository, events, () => new Date('2026-09-17T12:00:00.000Z'));

	return { events, repository, rows, service };
}

describe('EventPageService.get', () => {
	it('offers a layout built from the event when the organizer never touched the page', async () => {
		const { events, service } = build();

		const page = await service.get(TEST_USER_ID, TEST_EVENT_ID);

		expect(events.getForUser).toHaveBeenCalledWith(TEST_USER_ID, TEST_EVENT_ID);
		expect(page.enabled).toBe(false);
		expect(page.published).toBeNull();
		expect(page.draft.sections.map((section) => section.type)).toEqual(['hero', 'about', 'tickets']);
		expect(page.draft.sections[0]).toMatchObject({ title: 'Congresso' });
	});
});

describe('EventPageService.saveDraft', () => {
	it('stores the draft with its rich text sanitized, without touching what is published', async () => {
		const { repository, service } = build();
		const layout: EventPageLayout = buildDefaultEventPageLayout(event);
		layout.sections[1] = {
			...layout.sections[1],
			type: 'about',
			content: '<p>Oi</p><script>alert(1)</script>',
		} as never;

		await service.saveDraft(TEST_USER_ID, TEST_EVENT_ID, layout);

		const [, patch] = vi.mocked(repository.upsert).mock.calls[0];
		expect(patch.draft?.sections[1]).toMatchObject({ content: '<p>Oi</p>' });
		expect(patch).not.toHaveProperty('published');
		expect(patch).not.toHaveProperty('enabled');
	});
});

describe('EventPageService.publish', () => {
	it('copies the draft to the published layout and turns the page on', async () => {
		const draft = buildDefaultEventPageLayout(event);
		const { repository, service } = build({
			event_id: TEST_EVENT_ID,
			enabled: false,
			draft,
			published: null,
			published_at: null,
			date_updated: '2026-09-17T11:00:00.000Z',
		});

		const page = await service.publish(TEST_USER_ID, TEST_EVENT_ID);

		expect(repository.upsert).toHaveBeenCalledWith(
			TEST_EVENT_ID,
			expect.objectContaining({ enabled: true, published: draft, published_at: '2026-09-17T12:00:00.000Z' }),
		);
		expect(page.enabled).toBe(true);
	});

	it('refuses to publish a draft without the tickets section, listing what to fix', async () => {
		const draft = buildDefaultEventPageLayout(event);
		draft.sections = draft.sections.filter((section) => section.type !== 'tickets');
		const { repository, service } = build({
			event_id: TEST_EVENT_ID,
			enabled: false,
			draft,
			published: null,
			published_at: null,
			date_updated: '2026-09-17T11:00:00.000Z',
		});

		await expect(service.publish(TEST_USER_ID, TEST_EVENT_ID)).rejects.toMatchObject({
			statusCode: 422,
			code: 'EVENT_PAGE_INVALID',
			context: { issues: expect.arrayContaining([expect.objectContaining({ code: 'tickets_required' })]) },
		});
		expect(repository.upsert).not.toHaveBeenCalled();
	});
});

describe('EventPageService.unpublish', () => {
	it('turns the page off and keeps the draft, so the event falls back to the standard layout', async () => {
		const draft = buildDefaultEventPageLayout(event);
		const { repository, service } = build({
			event_id: TEST_EVENT_ID,
			enabled: true,
			draft,
			published: draft,
			published_at: '2026-09-16T12:00:00.000Z',
			date_updated: '2026-09-16T12:00:00.000Z',
		});

		const page = await service.unpublish(TEST_USER_ID, TEST_EVENT_ID);

		expect(page).toMatchObject({ enabled: false, draft, published: draft });
		expect(repository.upsert).not.toHaveBeenCalled();
	});

	it('returns the standard layout when no customized page has ever been saved', async () => {
		const { service } = build();
		const page = await service.unpublish(TEST_USER_ID, TEST_EVENT_ID);
		expect(page.enabled).toBe(false);
		expect(page.draft.sections.map((section) => section.type)).toEqual(['hero', 'about', 'tickets']);
	});
});
