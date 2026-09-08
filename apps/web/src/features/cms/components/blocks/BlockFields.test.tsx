import { screen, waitFor, within } from '@testing-library/react';
import { useState, type ComponentType } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, renderWithProviders } from '@/test';
import { eventsBlockForm } from './EventsBlockFields';
import { formBlockForm } from './FormBlockFields';
import { galleryBlockForm } from './GalleryBlockFields';
import { heroBlockForm } from './HeroBlockFields';
import { blockForms } from './index';
import { postsBlockForm } from './PostsBlockFields';
import { pricingBlockForm } from './PricingBlockFields';
import { richtextBlockForm } from './RichtextBlockFields';
import type { BlockFieldsProps } from './types';

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
	usePathname: () => '/super-admin/conteudo',
}));

/** Mantém o estado como o BlockFormSheet faz e expõe a última versão. */
function harness<State>(
	Fields: ComponentType<BlockFieldsProps<State>>,
	initial: State,
	errors?: BlockFieldsProps<State>['errors'],
) {
	const latest = vi.fn<(value: State) => void>();
	function Harness() {
		const [value, setValue] = useState(initial);

		return (
			<Fields
				value={value}
				errors={errors}
				onChange={(next) => {
					latest(next);
					setValue(next);
				}}
			/>
		);
	}

	return { Harness, latest, last: () => latest.mock.calls.at(-1)?.[0] as State };
}

const media = (id: string) => ({ id, bucket: 'media', path: `x/${id}.png`, filename: `${id}.png`, type: 'image/png' });

describe('block forms registry', () => {
	it('exposes a form definition for every block collection', () => {
		expect(Object.keys(blockForms).sort()).toEqual(
			[
				'block_events',
				'block_form',
				'block_gallery',
				'block_hero',
				'block_posts',
				'block_pricing',
				'block_richtext',
			].sort(),
		);
	});
});

describe('richtext block fields', () => {
	it('edits tagline and headline and treats an empty editor as no content', async () => {
		const { Harness, last } = harness(richtextBlockForm.Fields, richtextBlockForm.fromItem(null), {
			headline: ['Erro X'],
		});
		const { user } = renderWithProviders(<Harness />);

		await user.type(screen.getByLabelText(/tagline/i), 'Novo');
		await user.type(screen.getByLabelText('Título'), 'Cabeçalho');
		expect(last()).toMatchObject({ tagline: 'Novo', headline: 'Cabeçalho' });
		expect(screen.getByText('Erro X')).toBeInTheDocument();

		expect(richtextBlockForm.toPayload({ ...last(), content: '<p></p>' })).toMatchObject({
			content: '',
			headline: 'Cabeçalho',
		});
		expect(
			richtextBlockForm.toPayload({ tagline: '', headline: '', content: '<p>oi</p>', alignment: 'center' }),
		).toEqual({
			tagline: null,
			headline: null,
			content: '<p>oi</p>',
			alignment: 'center',
		});
		expect(richtextBlockForm.fromItem({ id: '1', content: '<p>x</p>', alignment: 'center' } as never)).toMatchObject({
			content: '<p>x</p>',
			alignment: 'center',
		});
	});
});

describe('posts block fields', () => {
	it('edits the headline and the limit', async () => {
		const { Harness, last } = harness(postsBlockForm.Fields, postsBlockForm.fromItem({ id: '1', limit: 3 } as never));
		const { user } = renderWithProviders(<Harness />);

		expect(screen.getByLabelText(/quantidade de posts/i)).toHaveValue(3);
		await user.type(screen.getByLabelText(/tagline/i), 'Blog');
		await user.type(screen.getByLabelText(/^título/i), 'Últimas');
		await user.clear(screen.getByLabelText(/quantidade de posts/i));
		await user.type(screen.getByLabelText(/quantidade de posts/i), '9');

		expect(postsBlockForm.toPayload(last())).toEqual({ tagline: 'Blog', headline: 'Últimas', limit: '9' });
	});
});

describe('events block fields', () => {
	it('loads the categories and edits filters', async () => {
		mockFetch([['/api/super-admin/categories', () => jsonResponse({ data: [{ id: 'c1', name: 'Tecnologia' }] })]]);
		const { Harness, last } = harness(eventsBlockForm.Fields, eventsBlockForm.fromItem(null));
		const { user } = renderWithProviders(<Harness />);

		await user.type(screen.getByLabelText(/^título/i), 'Agenda');
		await user.type(screen.getByLabelText(/descrição/i), 'Próximos');
		await user.clear(screen.getByLabelText(/máximo de eventos/i));
		await user.type(screen.getByLabelText(/máximo de eventos/i), '4');
		await user.click(screen.getByRole('checkbox', { name: /destaque/i }));
		await user.click(screen.getByRole('checkbox', { name: /passados/i }));

		expect(eventsBlockForm.toPayload(last())).toEqual({
			headline: 'Agenda',
			description: 'Próximos',
			filter_by_category: null,
			filter_featured: true,
			max_items: '4',
			show_past_events: true,
		});
		await waitFor(() => expect(fetch).toHaveBeenCalled());
	});
});

describe('form block fields', () => {
	it('lists the forms of the site and edits the copy', async () => {
		mockFetch([
			['/api/super-admin/cms/forms', () => jsonResponse({ data: [{ id: 'f1', title: 'Contato', is_active: false }] })],
		]);
		const { Harness, last } = harness(formBlockForm.Fields, formBlockForm.fromItem({ id: '1', form: 'f1' } as never));
		const { user } = renderWithProviders(<Harness />);

		await user.type(screen.getByLabelText(/tagline/i), 'Fale');
		await user.type(screen.getByLabelText(/^título/i), 'Contato');

		expect(formBlockForm.toPayload(last())).toEqual({ tagline: 'Fale', headline: 'Contato', form: 'f1' });
		await waitFor(() => expect(fetch).toHaveBeenCalled());
	});
});

describe('gallery block fields', () => {
	it('reorders and removes images and serialises them as file ids', async () => {
		mockFetch([
			[
				'/api/super-admin/cms/media',
				() => jsonResponse({ data: [], pagination: { page: 1, limit: 24, total: 0, pageCount: 1 } }),
			],
		]);
		const initial = galleryBlockForm.fromItem({
			id: 'g',
			items: [
				{ id: 'i1', file: media('a') },
				{ id: 'i2', file: media('b') },
			],
		} as never);
		const { Harness, last } = harness(galleryBlockForm.Fields, initial);
		const { user } = renderWithProviders(<Harness />);

		await user.click(screen.getByRole('button', { name: /mover imagem 2 para cima/i }));
		expect(last().items.map((item) => item.file.id)).toEqual(['b', 'a']);
		await user.click(screen.getByRole('button', { name: /mover imagem 1 para baixo/i }));
		expect(last().items.map((item) => item.file.id)).toEqual(['a', 'b']);
		await user.click(screen.getByRole('button', { name: /remover imagem 1/i }));
		expect(last().items.map((item) => item.file.id)).toEqual(['b']);

		await user.click(screen.getByRole('button', { name: /adicionar imagem/i }));
		expect(await screen.findByRole('dialog')).toBeInTheDocument();

		expect(
			galleryBlockForm.toPayload({
				tagline: '',
				headline: 'Fotos',
				items: [{ id: 'i2', file: media('b') }, { file: media('c') }],
			}),
		).toEqual({
			tagline: null,
			headline: 'Fotos',
			items: [{ id: 'i2', file: 'b' }, { file: 'c' }],
		});
	});
});

describe('pricing block fields', () => {
	it('adds, edits, reorders and removes plans and splits features by line', { timeout: 30_000 }, async () => {
		const { Harness, last } = harness(pricingBlockForm.Fields, pricingBlockForm.fromItem(null));
		const { user } = renderWithProviders(<Harness />);

		await user.click(screen.getByRole('button', { name: /adicionar plano/i }));
		await user.click(screen.getByRole('button', { name: /adicionar plano/i }));
		const first = screen.getByRole('group', { name: 'Plano 1' });
		await user.type(within(first).getByLabelText(/nome do plano/i), 'Grátis');
		await user.type(within(first).getByLabelText(/preço/i), 'R$ 0');
		await user.type(within(first).getByLabelText(/selo/i), 'Popular');
		await user.type(within(first).getByLabelText(/^descrição/i), 'Para começar');
		await user.type(within(first).getByLabelText(/recursos/i), 'Um evento{enter} {enter}Check-in');
		await user.click(within(first).getByRole('checkbox', { name: /destacar/i }));
		await user.click(within(first).getByRole('button', { name: /adicionar botão/i }));
		await user.type(within(first).getByLabelText(/^texto$/i), 'Começar');
		await user.type(within(first).getByLabelText(/^endereço$/i), '/perfil');

		await user.type(within(screen.getByRole('group', { name: 'Plano 2' })).getByLabelText(/nome do plano/i), 'Pro');
		await user.click(screen.getByRole('button', { name: /mover plano 2 para cima/i }));
		expect(last().cards.map((card) => card.title)).toEqual(['Pro', 'Grátis']);
		await user.click(screen.getByRole('button', { name: /mover plano 1 para baixo/i }));
		expect(last().cards.map((card) => card.title)).toEqual(['Grátis', 'Pro']);
		await user.click(screen.getByRole('button', { name: /remover plano 2/i }));

		const payload = pricingBlockForm.toPayload(last()) as { cards: unknown[] };
		expect(payload.cards).toEqual([
			{
				title: 'Grátis',
				description: 'Para começar',
				price: 'R$ 0',
				badge: 'Popular',
				features: ['Um evento', 'Check-in'],
				is_highlighted: true,
				button: { label: 'Começar', type: 'url', url: '/perfil', page: null, post: null, variant: 'default' },
			},
		]);

		await user.click(screen.getByRole('button', { name: /remover botão do plano 1/i }));
		expect(last().cards[0].button).toBeNull();
	});

	it('restores cards from the API row, including the button and features', () => {
		const state = pricingBlockForm.fromItem({
			id: 'p',
			cards: [
				{
					id: 'c1',
					title: 'Pro',
					description: null,
					price: 'R$ 99',
					badge: null,
					features: ['A', 'B'],
					is_highlighted: false,
					button: { id: 'b1', label: 'Ir', type: 'page', url: null, page: 'p1', post: null, variant: 'outline' },
				},
			],
		} as never);

		expect(state.cards[0]).toMatchObject({
			id: 'c1',
			features: 'A\nB',
			button: { id: 'b1', type: 'page', page: { id: 'p1' } },
		});
		expect((pricingBlockForm.toPayload(state) as { cards: unknown[] }).cards[0]).toMatchObject({
			id: 'c1',
			button: { id: 'b1', type: 'page', page: 'p1', url: null, post: null },
		});
	});
});

describe('hero block fields', () => {
	it('edits the copy and serialises the image and buttons', async () => {
		mockFetch([
			[
				'/api/super-admin/cms/media',
				() => jsonResponse({ data: [], pagination: { page: 1, limit: 24, total: 0, pageCount: 1 } }),
			],
		]);
		const initial = heroBlockForm.fromItem({
			id: 'h',
			tagline: null,
			headline: 'Antes',
			description: null,
			image: media('img'),
			layout: 'image_left',
			buttons: [{ id: 'b1', label: 'Ir', type: 'url', url: '/x', page: null, post: null, variant: 'ghost' }],
		} as never);
		expect(initial).toMatchObject({
			headline: 'Antes',
			layout: 'image_left',
			image: { id: 'img' },
			buttons: [{ id: 'b1' }],
		});
		const { Harness, last } = harness(heroBlockForm.Fields, initial);
		const { user } = renderWithProviders(<Harness />);

		await user.type(screen.getByLabelText(/tagline/i), 'Olá');
		await user.clear(screen.getByLabelText(/título principal/i));
		await user.type(screen.getByLabelText(/título principal/i), 'Depois');
		await user.type(screen.getByLabelText(/^descrição/i), 'Texto');
		await user.click(screen.getByRole('button', { name: /remover botão 1/i }));

		expect(heroBlockForm.toPayload(last())).toEqual({
			tagline: 'Olá',
			headline: 'Depois',
			description: 'Texto',
			image: 'img',
			layout: 'image_left',
			buttons: [],
		});
	});
});
