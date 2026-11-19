import { describe, expect, it } from 'vitest';
import {
	buildDefaultEventPageLayout,
	buildEventPageSection,
	EVENT_PAGE_SECTION_TYPES,
	eventPageLayoutSchema,
} from '@events-manager/contracts';
import { layoutToPuckData, puckDataToLayout } from './data';
import type { EventPageData } from './types';

describe('event layout boundary for Puck', () => {
	it('opens every existing section and round-trips all content, media, anchors, visibility and page settings', () => {
		const layout = buildDefaultEventPageLayout({ title: 'Encontro', description: '<p>Olá <strong>mundo</strong></p>' });
		layout.sections = EVENT_PAGE_SECTION_TYPES.map((type) => buildEventPageSection(type));
		layout.sections[1] = { ...layout.sections[1], hidden: true };
		layout.theme = { mode: 'dark', accent: '#743DF5' };
		layout.header.logo = '00000000-0000-4000-8000-000000000051';
		layout.footer.note = 'Até breve';
		const data = layoutToPuckData(layout);
		expect(data.content.map((item) => item.type)).toEqual(EVENT_PAGE_SECTION_TYPES);
		expect(puckDataToLayout(data)).toEqual(layout);
	});
	it('keeps the published object isolated from changes made in the editor', () => {
		const layout = buildDefaultEventPageLayout({ title: 'Encontro' });
		const data = layoutToPuckData(layout);
		data.root.props!.header.title = 'Outro nome';
		data.content.reverse();
		expect(layout.header.title).toBe('Encontro');
		expect(layout.sections[0].type).toBe('hero');
	});
	it('preserves reordering and field edits without storing Puck UI or resolved event data', () => {
		const data = layoutToPuckData(buildDefaultEventPageLayout({ title: 'Encontro' }));
		data.content.reverse();
		data.content[0].props.title = 'Escolha seu ingresso';
		const layout = puckDataToLayout(data);
		expect(layout.sections[0]).toMatchObject({ type: 'tickets', title: 'Escolha seu ingresso' });
		expect(Object.keys(layout)).toEqual(['version', 'theme', 'header', 'footer', 'sections']);
		expect(eventPageLayoutSchema.safeParse(layout).success).toBe(true);
	});
	it('leaves validation to the shared schema so unsupported blocks cannot be saved', () => {
		const data = layoutToPuckData(buildDefaultEventPageLayout({ title: 'Encontro' }));
		data.content.push({
			type: 'script',
			props: { id: 'x', code: 'alert(1)' },
		} as unknown as EventPageData['content'][number]);
		expect(eventPageLayoutSchema.safeParse(puckDataToLayout(data)).success).toBe(false);
	});
});
