import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, problemResponse, renderWithProviders } from '@/test';
import type { CmsBlockRow } from '../types';
import { BlockBuilder } from './BlockBuilder';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
vi.mock('next/image', () => ({
	default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}));
const revalidate = vi.hoisted(() => vi.fn());
vi.mock('../api/actions', () => ({ revalidateCmsContent: revalidate }));

afterEach(() => vi.unstubAllGlobals());

const pageId = '20000000-0000-0000-0000-000000000001';
const heroId = '44000000-0000-0000-0000-000000000001';
const textId = '44000000-0000-0000-0000-000000000002';

const blocks: CmsBlockRow[] = [
	{
		id: heroId,
		page: pageId,
		collection: 'block_hero',
		sort: 1,
		hide_block: false,
		background: 'light',
		date_created: '2026-09-01T00:00:00Z',
		item: {
			id: 'i1',
			tagline: null,
			headline: 'Eventos que viram histórias',
			description: null,
			image: null,
			layout: 'image_right',
			buttons: [],
		},
	},
	{
		id: textId,
		page: pageId,
		collection: 'block_richtext',
		sort: 2,
		hide_block: false,
		background: 'light',
		date_created: '2026-09-01T00:00:00Z',
		item: { id: 'i2', tagline: null, headline: 'Como funciona', content: '<p>x</p>', alignment: 'left' },
	},
];

describe('BlockBuilder', () => {
	it('lists the blocks with a readable type and their headline', () => {
		mockFetch([]);
		renderWithProviders(<BlockBuilder pageId={pageId} blocks={blocks} />);

		const items = screen.getAllByRole('listitem');
		expect(items[0]).toHaveTextContent('Hero');
		expect(items[0]).toHaveTextContent('Eventos que viram histórias');
		expect(items[1]).toHaveTextContent('Texto rico');
		expect(items[1]).toHaveTextContent('Como funciona');
	});

	it('offers the seven block types and opens the matching form when one is picked', async () => {
		mockFetch([]);
		const { user } = renderWithProviders(<BlockBuilder pageId={pageId} blocks={blocks} />);

		await user.click(screen.getByRole('button', { name: /adicionar bloco/i }));
		const picker = await screen.findByRole('dialog', { name: /escolha o tipo de bloco/i });
		const types = within(picker).getByRole('list', { name: /tipos de bloco/i });
		expect(within(types).getAllByRole('button')).toHaveLength(7);

		await user.click(within(types).getByRole('button', { name: /texto rico/i }));

		expect(await screen.findByRole('heading', { name: /novo bloco: texto rico/i })).toBeInTheDocument();
	});

	it('moves a block down by sending the whole new order to the API', async () => {
		const fetchMock = mockFetch([[`/pages/${pageId}/blocks/order`, () => jsonResponse({ success: true })]]);
		const { user } = renderWithProviders(<BlockBuilder pageId={pageId} blocks={blocks} />);

		await user.click(screen.getByRole('button', { name: /mover hero para baixo/i }));

		await waitFor(() => expect(refresh).toHaveBeenCalled());
		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe(`/api/super-admin/cms/pages/${pageId}/blocks/order`);
		expect(init?.method).toBe('PUT');
		expect(JSON.parse(String(init?.body))).toEqual({ order: [textId, heroId] });
		expect(revalidate).toHaveBeenCalled();
	});

	it('hides a visible block with a partial update', async () => {
		const fetchMock = mockFetch([
			[`/pages/${pageId}/blocks/${textId}`, () => jsonResponse({ ...blocks[1], hide_block: true })],
		]);
		const { user } = renderWithProviders(<BlockBuilder pageId={pageId} blocks={blocks} />);

		await user.click(screen.getByRole('button', { name: /ocultar texto rico/i }));

		await waitFor(() => expect(refresh).toHaveBeenCalled());
		const [, init] = fetchMock.mock.calls[0];
		expect(init?.method).toBe('PATCH');
		expect(JSON.parse(String(init?.body))).toEqual({ hide_block: true });
	});

	it('toggles the background, moves a block up, opens the editor and deletes after confirmation', async () => {
		const fetchMock = mockFetch([
			[`/pages/${pageId}/blocks/order`, () => jsonResponse({ success: true })],
			[`/pages/${pageId}/blocks/${heroId}`, () => jsonResponse({ success: true })],
		]);
		const { user } = renderWithProviders(<BlockBuilder pageId={pageId} blocks={blocks} />);

		await user.click(screen.getByRole('button', { name: /usar fundo escuro em hero/i }));
		await waitFor(() => expect(revalidate).toHaveBeenCalled());
		expect(JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1]?.body))).toEqual({ background: 'dark' });

		await user.click(screen.getByRole('button', { name: /mover texto rico para cima/i }));
		await waitFor(() =>
			expect(JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1]?.body))).toEqual({ order: [textId, heroId] }),
		);

		await user.click(screen.getByRole('button', { name: /editar hero/i }));
		expect(await screen.findByRole('dialog')).toHaveTextContent(/hero/i);
		await user.keyboard('{Escape}');

		await user.click(screen.getByRole('button', { name: /excluir hero/i }));
		await user.click(await screen.findByRole('button', { name: /^excluir$/i }));
		await waitFor(() => expect(fetchMock.mock.calls.at(-1)?.[1]?.method).toBe('DELETE'));
		expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain(`/pages/${pageId}/blocks/${heroId}`);
	});

	it('reports an API failure without refreshing the page', async () => {
		mockFetch([[`/pages/${pageId}/blocks/${textId}`, () => problemResponse(500, 'INTERNAL_ERROR', 'Falhou')]]);
		const { user } = renderWithProviders(<BlockBuilder pageId={pageId} blocks={blocks} />);
		refresh.mockClear();

		await user.click(screen.getByRole('button', { name: /ocultar texto rico/i }));

		await waitFor(() => expect(screen.getByRole('button', { name: /ocultar texto rico/i })).toBeEnabled());
		expect(refresh).not.toHaveBeenCalled();
	});
});
