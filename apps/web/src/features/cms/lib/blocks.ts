import type { CmsBlockCollection } from '@events-manager/contracts';
import { CalendarDays, FileText, GalleryHorizontal, Images, LayoutPanelTop, Newspaper, Tags } from 'lucide-react';
import type { CmsBlockRow } from '../types';

export interface BlockTypeMeta {
	collection: CmsBlockCollection;
	label: string;
	description: string;
	icon: typeof FileText;
}

export const BLOCK_TYPES: BlockTypeMeta[] = [
	{
		collection: 'block_hero',
		label: 'Hero',
		description: 'Destaque de abertura com título, texto, imagem e botões.',
		icon: LayoutPanelTop,
	},
	{
		collection: 'block_richtext',
		label: 'Texto rico',
		description: 'Parágrafos, listas, títulos e links com formatação.',
		icon: FileText,
	},
	{
		collection: 'block_gallery',
		label: 'Galeria',
		description: 'Grade de imagens da biblioteca de mídia.',
		icon: Images,
	},
	{
		collection: 'block_pricing',
		label: 'Planos e preços',
		description: 'Cartões comparando planos, com destaque e botão.',
		icon: Tags,
	},
	{
		collection: 'block_posts',
		label: 'Posts do blog',
		description: 'Os posts mais recentes publicados no blog.',
		icon: Newspaper,
	},
	{
		collection: 'block_events',
		label: 'Eventos',
		description: 'Lista de eventos filtrada por categoria ou destaque.',
		icon: CalendarDays,
	},
	{
		collection: 'block_form',
		label: 'Formulário',
		description: 'Um formulário criado em "Formulários" para captar contatos.',
		icon: GalleryHorizontal,
	},
];

const byCollection = Object.fromEntries(BLOCK_TYPES.map((type) => [type.collection, type])) as Record<
	CmsBlockCollection,
	BlockTypeMeta
>;

export function blockTypeMeta(collection: CmsBlockCollection) {
	return byCollection[collection];
}

/** Texto curto que identifica o bloco na lista do construtor. */
export function blockSummary(block: CmsBlockRow): string {
	switch (block.collection) {
		case 'block_hero':
			return block.item.headline;
		case 'block_richtext':
			return block.item.headline || stripHtml(block.item.content).slice(0, 80) || 'Sem título';
		case 'block_gallery':
			return (
				block.item.headline || `${block.item.items.length} ${block.item.items.length === 1 ? 'imagem' : 'imagens'}`
			);
		case 'block_pricing':
			return block.item.headline || `${block.item.cards.length} ${block.item.cards.length === 1 ? 'plano' : 'planos'}`;
		case 'block_posts':
			return block.item.headline || `Últimos ${block.item.limit} posts`;
		case 'block_events':
			return (
				block.item.headline || (block.item.category ? `Categoria: ${block.item.category.name}` : 'Próximos eventos')
			);
		case 'block_form':
			return block.item.headline || block.item.form_definition?.title || 'Formulário não escolhido';
		default:
			return '';
	}
}

function stripHtml(html: string) {
	return html
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}
