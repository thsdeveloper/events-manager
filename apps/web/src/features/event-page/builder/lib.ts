import {
	EVENT_PAGE_SECTION_META,
	newEventPageItemId,
	nextEventPageAnchor,
	type EventPageLayout,
	type EventPageRecord,
	type EventPageSection,
	type EventPageSectionType,
} from '@events-manager/contracts';
import { htmlToPlainText } from '@/components/ui/Text';

/** Tipos que fazem sentido uma vez só na página. */
export const UNIQUE_SECTION_TYPES: ReadonlySet<EventPageSectionType> = new Set([
	'hero',
	'tickets',
	'countdown',
	'location',
]);

/** A seção de ingressos é o caminho para o checkout: não sai nem se esconde. */
export function isProtectedSection(section: EventPageSection) {
	return section.type === 'tickets';
}

export function canAddSectionType(type: EventPageSectionType, sections: EventPageSection[]) {
	if (!UNIQUE_SECTION_TYPES.has(type)) return true;

	return !sections.some((section) => section.type === type);
}

export function moveSection(sections: EventPageSection[], from: number, to: number) {
	if (to < 0 || to >= sections.length || from === to) return sections;
	const next = [...sections];
	const [moved] = next.splice(from, 1);
	next.splice(to, 0, moved);

	return next;
}

export function duplicateSection(section: EventPageSection, sections: EventPageSection[]): EventPageSection {
	const taken = sections.map((item) => item.anchor);
	const copy = structuredClone(section) as EventPageSection & { items?: Array<{ id: string }> };
	if (Array.isArray(copy.items)) copy.items = copy.items.map((item) => ({ ...item, id: newEventPageItemId() }));

	return { ...copy, id: newEventPageItemId(), anchor: nextEventPageAnchor(section.type, taken) };
}

/** Texto curto para o cartão da seção na lista. */
export function sectionSummary(section: EventPageSection): string {
	if (section.title?.trim()) return section.title.trim();
	switch (section.type) {
		case 'about':
		case 'richtext': {
			const text = htmlToPlainText(section.content).replace(/\s+/g, ' ');

			return text ? text.slice(0, 80) : 'Sem texto';
		}
		case 'cta':
			return section.headline || 'Chamada';
		case 'schedule':
		case 'speakers':
		case 'faq':
		case 'gallery':
		case 'sponsors':
			return section.items.length === 0
				? 'Sem itens'
				: `${section.items.length} ${section.items.length === 1 ? 'item' : 'itens'}`;
		default:
			return EVENT_PAGE_SECTION_META[section.type].label;
	}
}

export type PageStatus =
	| { kind: 'draft' }
	| { kind: 'published'; publishedAt: string }
	| { kind: 'changed'; publishedAt: string };

/** Rascunho nunca publicado, página no ar igual ao rascunho, ou no ar com mudanças pendentes. */
export function describePageStatus(record: EventPageRecord): PageStatus {
	if (!record.enabled || !record.published || !record.published_at) return { kind: 'draft' };
	const same = JSON.stringify(record.published) === JSON.stringify(record.draft);

	return same
		? { kind: 'published', publishedAt: record.published_at }
		: { kind: 'changed', publishedAt: record.published_at };
}

export function layoutsEqual(left: EventPageLayout, right: EventPageLayout) {
	return JSON.stringify(left) === JSON.stringify(right);
}
