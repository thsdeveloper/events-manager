/**
 * Página exclusiva do evento: um layout em JSON que o organizador monta com
 * seções e um cabeçalho próprio. As regras que API e painel compartilham:
 * a seção de ingressos é obrigatória (é por ela que se chega ao checkout), as
 * âncoras são únicas e a navegação do cabeçalho só aponta para âncoras da
 * própria página, nunca para páginas internas.
 */
import { describe, expect, it } from 'vitest';
import {
	buildDefaultEventPageLayout,
	buildEventPageSection,
	nextEventPageAnchor,
	EVENT_PAGE_SECTION_TYPES,
	eventPageLayoutSchema,
	validateEventPageLayout,
} from './event-page.js';

const MEDIA_ID = '00000000-0000-4000-8000-000000000051';

const base = () =>
	buildDefaultEventPageLayout({
		title: 'Congresso',
		description: '<p>Três dias.</p>',
		short_description: 'Encontro anual.',
		cover_image: MEDIA_ID,
		start_date: '2026-09-19T12:00:00.000Z',
	});

describe('safe editor section defaults', () => {
	it.each(EVENT_PAGE_SECTION_TYPES)('creates a valid %s section with a fresh unique anchor', (type) => {
		const first = buildEventPageSection(type);
		const second = buildEventPageSection(type, [first.anchor]);
		const thirdAnchor = nextEventPageAnchor(type, [first.anchor, second.anchor]);
		expect(second.anchor).not.toBe(first.anchor);
		expect(thirdAnchor).not.toBe(second.anchor);
		expect(second.id).not.toBe(first.id);
		expect(second.type).toBe(type);
		expect(second.hidden).toBe(false);
	});
	it('refuses publishing when all checkout sections are hidden', () => {
		const layout = base();
		layout.sections = layout.sections.map((section) =>
			section.type === 'tickets' ? { ...section, hidden: true } : section,
		);
		expect(validateEventPageLayout(layout)).toEqual(
			expect.arrayContaining([expect.objectContaining({ code: 'tickets_hidden' })]),
		);
	});
});

describe('buildDefaultEventPageLayout', () => {
	it('starts from the event itself: hero, about and the mandatory tickets section', () => {
		const layout = base();

		expect(layout.version).toBe(1);
		expect(layout.sections.map((section) => section.type)).toEqual(['hero', 'about', 'tickets']);
		expect(layout.sections[0]).toMatchObject({ type: 'hero', title: 'Congresso', image: MEDIA_ID });
		expect(layout.header.nav.map((item) => item.anchor)).toEqual(['sobre', 'ingressos']);
		expect(eventPageLayoutSchema.safeParse(layout).success).toBe(true);
	});
});

describe('eventPageLayoutSchema', () => {
	it('knows every section type the builder offers', () => {
		expect(EVENT_PAGE_SECTION_TYPES).toEqual(
			expect.arrayContaining([
				'hero',
				'about',
				'tickets',
				'schedule',
				'speakers',
				'location',
				'faq',
				'gallery',
				'sponsors',
				'cta',
				'countdown',
				'richtext',
			]),
		);
	});

	it('rejects a header link that is not an anchor of this page', () => {
		const layout = base();
		layout.header.nav = [{ label: 'Blog', anchor: '/blog' }];

		const result = eventPageLayoutSchema.safeParse(layout);

		expect(result.success).toBe(false);
	});
});

describe('validateEventPageLayout', () => {
	it('refuses to publish without the tickets section, the way to the checkout', () => {
		const layout = base();
		layout.sections = layout.sections.filter((section) => section.type !== 'tickets');

		expect(validateEventPageLayout(layout)).toEqual(
			expect.arrayContaining([expect.objectContaining({ code: 'tickets_required' })]),
		);
	});

	it('refuses two sections with the same anchor and a nav item pointing nowhere', () => {
		const layout = base();
		layout.sections[1].anchor = 'ingressos';
		layout.header.nav = [{ label: 'Palestrantes', anchor: 'palestrantes' }];

		const codes = validateEventPageLayout(layout).map((issue) => issue.code);

		expect(codes).toEqual(expect.arrayContaining(['duplicate_anchor', 'nav_anchor_missing']));
	});

	it('accepts the default layout as publishable', () => {
		expect(validateEventPageLayout(base())).toEqual([]);
	});
});
