/**
 * Regras puras do construtor da página do evento: o que o organizador pode
 * fazer com cada seção, como o estado da página é descrito e como as seções
 * se movem na lista.
 */
import { describe, expect, it } from 'vitest';
import { buildDefaultEventPageLayout, type EventPageRecord } from '@events-manager/contracts';
import { describePageStatus } from './lib';

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
	it('reconhece uma publicação idêntica independentemente da ordem das propriedades do JSONB', () => {
		const draft = layout();
		const published = {
			...draft,
			header: Object.fromEntries(Object.entries(draft.header).reverse()) as typeof draft.header,
		};
		expect(
			describePageStatus({
				event_id: 'event',
				draft,
				published,
				enabled: true,
				published_at: '2026-11-19T12:00:00Z',
				date_updated: '',
			}).kind,
		).toBe('published');
	});

	it('continua exibindo o status enquanto um campo obrigatório está sendo editado', () => {
		const published = layout();
		const draft = {
			...published,
			sections: published.sections.map((section, index) => (index === 0 ? { ...section, anchor: '' } : section)),
		};
		expect(
			describePageStatus({
				event_id: 'event',
				draft,
				published,
				enabled: true,
				published_at: '2026-11-19T12:00:00Z',
				date_updated: '',
			}).kind,
		).toBe('changed');
	});
});
