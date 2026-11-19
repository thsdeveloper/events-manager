import { eventPageLayoutSchema, type EventPageRecord } from '@events-manager/contracts';

export type PageStatus =
	| { kind: 'draft' }
	| { kind: 'published'; publishedAt: string }
	| { kind: 'changed'; publishedAt: string };

/** Rascunho nunca publicado, página no ar igual ao rascunho, ou no ar com mudanças pendentes. */
export function describePageStatus(record: EventPageRecord): PageStatus {
	if (!record.enabled || !record.published || !record.published_at) return { kind: 'draft' };
	const published = eventPageLayoutSchema.safeParse(record.published);
	const draft = eventPageLayoutSchema.safeParse(record.draft);
	const same = published.success && draft.success && JSON.stringify(published.data) === JSON.stringify(draft.data);

	return same
		? { kind: 'published', publishedAt: record.published_at }
		: { kind: 'changed', publishedAt: record.published_at };
}
