/**
 * Regras puras do construtor da página do evento: o que o organizador pode
 * fazer com cada seção, como o estado da página é descrito e como as seções
 * se movem na lista.
 */
import { describe, expect, it } from 'vitest';
import { buildDefaultEventPageLayout, type EventPageRecord } from '@events-manager/contracts';
import {
	canAddSectionType,
	describePageStatus,
	duplicateSection,
	isProtectedSection,
	moveSection,
	sectionSummary,
} from './lib';

const layout = () =>
	buildDefaultEventPageLayout({ title: 'Congresso', description: '<p>Oi</p>', short_description: 'Encontro' });

describe('describePageStatus', () => {
	it('tells a never published page from a live one and from one with unpublished changes', () => {
		const draft = layout();
		const base: EventPageRecord = {
			event_id: 'e-1',
			enabled: false,
			draft,
			published: null,
			published_at: null,
			date_updated: '',
		};

		expect(describePageStatus(base)).toMatchObject({ kind: 'draft' });
		expect(
			describePageStatus({ ...base, enabled: true, published: draft, published_at: '2026-09-17T12:00:00.000Z' }),
		).toMatchObject({ kind: 'published' });
		expect(
			describePageStatus({
				...base,
				enabled: true,
				published: draft,
				published_at: '2026-09-17T12:00:00.000Z',
				draft: { ...draft, header: { ...draft.header, title: 'Outro' } },
			}),
		).toMatchObject({ kind: 'changed' });
	});
});

describe('sections', () => {
	it('protects the tickets section from removal and hiding, and keeps single-use types unique', () => {
		const sections = layout().sections;

		expect(isProtectedSection(sections[2])).toBe(true);
		expect(isProtectedSection(sections[1])).toBe(false);
		expect(canAddSectionType('tickets', sections)).toBe(false);
		expect(canAddSectionType('hero', sections)).toBe(false);
		expect(canAddSectionType('faq', sections)).toBe(true);
		expect(canAddSectionType('richtext', [...sections, { ...sections[1], type: 'richtext', id: 'x' } as never])).toBe(
			true,
		);
	});

	it('moves a section within bounds and duplicates it with a fresh id and anchor', () => {
		const sections = layout().sections;

		expect(moveSection(sections, 0, 1).map((section) => section.type)).toEqual(['about', 'hero', 'tickets']);
		expect(moveSection(sections, 0, -1)).toBe(sections);

		const copy = duplicateSection(sections[1], sections);
		expect(copy.id).not.toBe(sections[1].id);
		expect(copy.anchor).toBe('sobre-2');
		expect(copy).toMatchObject({ type: 'about', title: 'Sobre o evento' });
	});

	it('summarizes each section by its title or by what it holds', () => {
		const sections = layout().sections;

		expect(sectionSummary(sections[0])).toBe('Congresso');
		expect(sectionSummary({ ...sections[1], title: undefined, content: '<p>Três dias</p>' } as never)).toBe(
			'Três dias',
		);
		expect(sectionSummary({ id: 'f', anchor: 'faq', hidden: false, type: 'faq', items: [] })).toBe('Sem itens');
	});
});
