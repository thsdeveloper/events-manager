import { describe, expect, it } from 'vitest';
import {
	buildDefaultEventPageLayout,
	buildEventPageSection,
	EVENT_PAGE_SECTION_TYPES,
} from '@events-manager/contracts';
import { publicEventFixture } from '@/test/event-page-fixtures';
import { layoutToPuckData } from './data';
import { createEditorConfig } from './editor-config';

const event = { ...publicEventFixture, cover_image: null };
function setup() {
	const data = layoutToPuckData(buildDefaultEventPageLayout(event));

	return { data, config: createEditorConfig(event, data, () => data) };
}
describe('catálogo Puck do evento', () => {
	it('oferece todas as seções e campos editáveis sem campos indefinidos', () => {
		const { config } = setup();
		expect(Object.keys(config.components)).toEqual(EVENT_PAGE_SECTION_TYPES);
		for (const component of Object.values(config.components)) {
			expect(Object.values(component.fields ?? {}).every(Boolean)).toBe(true);
		}
		expect(config.components.tickets.fields).not.toHaveProperty('hidden');
	});
	it('preserva âncoras e identificadores ao abrir um rascunho existente', async () => {
		const { data, config } = setup();
		const item = data.content.find((item) => item.type === 'about')!;
		const resolved = await config.components.about.resolveData!(item, {} as never);
		expect(resolved.props).toEqual(item.props);
	});
	it('atribui uma âncora livre ao duplicar uma seção', async () => {
		const { data, config } = setup();
		const item = data.content.find((item) => item.type === 'about')!;
		const duplicate = { ...item, props: { ...item.props, id: 'about-copy' } };
		const resolved = await config.components.about.resolveData!(duplicate, {} as never);
		expect(resolved.props?.anchor).toBe('sobre-2');
	});
	it('recria os identificadores dos itens duplicados para editar cada item separadamente', async () => {
		const { config } = setup();
		const { type, ...props } = buildEventPageSection('faq');
		const resolved = await config.components.faq.resolveData!(
			{
				props: {
					...props,
					items: [
						{ id: 'same', question: 'Um', answer: 'A' },
						{ id: 'same', question: 'Dois', answer: 'B' },
					],
				},
			},
			{} as never,
		);
		expect(new Set(resolved.props?.items?.map((item) => item.id)).size).toBe(2);
	});
	it('protege ingressos e respeita permissões de leitura', async () => {
		const { data, config } = setup();
		const item = data.content.find((item) => item.type === 'tickets')!;
		const resolve = config.components.tickets.resolvePermissions!;
		const allowed = await resolve(item, {
			permissions: { edit: true, delete: true, duplicate: true, insert: true, drag: true },
			appState: { data },
		} as never);
		expect(allowed).toMatchObject({ delete: false, duplicate: false, insert: false, edit: true });
		const denied = await resolve(item, {
			permissions: { edit: false, delete: false, duplicate: false, insert: false, drag: false },
			appState: { data },
		} as never);
		expect(Object.values(denied).some(Boolean)).toBe(false);
	});
	it('não permite duplicação acima do limite de trinta seções', async () => {
		const { data, config } = setup();
		const item = data.content.find((item) => item.type === 'about')!;
		data.content = Array.from({ length: 30 }, (_, i) => ({ ...item, props: { ...item.props, id: String(i) } }));
		const permissions = await config.components.about.resolvePermissions!(item, {
			permissions: { edit: true, insert: true, duplicate: true, delete: true, drag: true },
			appState: { data },
		} as never);
		expect(permissions).toMatchObject({ insert: false, duplicate: false });
	});
	it('permite apagar o site opcional de um apoiador sem invalidar o formulário', async () => {
		const { config } = setup();
		const resolved = await config.components.sponsors.resolveData!(
			{
				props: {
					id: 'sponsor',
					anchor: 'apoio',
					hidden: false,
					items: [{ id: 'item', name: 'Parceiro', logo: '00000000-0000-4000-8000-000000000051', url: '' }],
				},
			},
			{} as never,
		);
		expect(resolved.props?.items?.[0].url).toBeNull();
	});
});
