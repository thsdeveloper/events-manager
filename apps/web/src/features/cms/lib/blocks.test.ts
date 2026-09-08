import { describe, expect, it } from 'vitest';
import type { CmsBlockRow } from '../types';
import { BLOCK_TYPES, blockSummary, blockTypeMeta } from './blocks';

const base = { id: 'b', page: 'p', sort: 1, hide_block: false, background: 'light' as const, date_created: '' };

describe('block metadata', () => {
	it('describes the seven block types with a readable label', () => {
		expect(BLOCK_TYPES.map((type) => type.label)).toEqual([
			'Hero',
			'Texto rico',
			'Galeria',
			'Planos e preços',
			'Posts do blog',
			'Eventos',
			'Formulário',
		]);
		expect(blockTypeMeta('block_form').label).toBe('Formulário');
	});

	it('summarises each block by its headline or by what it contains', () => {
		const blocks: CmsBlockRow[] = [
			{
				...base,
				collection: 'block_hero',
				item: {
					id: 'i',
					tagline: null,
					headline: 'Olá',
					description: null,
					image: null,
					layout: 'image_right',
					buttons: [],
				},
			},
			{
				...base,
				collection: 'block_richtext',
				item: { id: 'i', tagline: null, headline: null, content: '<p>Texto <b>rico</b></p>', alignment: 'left' },
			},
			{
				...base,
				collection: 'block_gallery',
				item: { id: 'i', tagline: null, headline: null, items: [{ id: 'g', sort: 1, file: { id: 'f' } }] },
			},
			{ ...base, collection: 'block_pricing', item: { id: 'i', tagline: null, headline: null, cards: [] } },
			{ ...base, collection: 'block_posts', item: { id: 'i', tagline: null, headline: null, limit: 3 } },
			{
				...base,
				collection: 'block_events',
				item: {
					id: 'i',
					headline: null,
					description: null,
					filter_by_category: 'c',
					filter_featured: false,
					max_items: 4,
					show_past_events: false,
					category: { id: 'c', name: 'Música', slug: 'musica' },
				},
			},
			{
				...base,
				collection: 'block_form',
				item: {
					id: 'i',
					tagline: null,
					headline: null,
					form: 'f',
					form_definition: { id: 'f', title: 'Contato', is_active: true },
				},
			},
		];

		expect(blocks.map(blockSummary)).toEqual([
			'Olá',
			'Texto rico',
			'1 imagem',
			'0 planos',
			'Últimos 3 posts',
			'Categoria: Música',
			'Contato',
		]);
	});
});
