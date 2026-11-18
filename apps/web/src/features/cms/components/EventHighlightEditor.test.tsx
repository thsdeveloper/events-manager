import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, renderWithProviders } from '@/test';
import { BlockBuilder } from './BlockBuilder';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('../api/actions', () => ({ revalidateCmsContent: vi.fn() }));
afterEach(() => vi.unstubAllGlobals());
const pageId = '20000000-0000-0000-0000-000000000001';

async function openEditor() {
	const { user } = renderWithProviders(<BlockBuilder pageId={pageId} blocks={[]} />);
	await user.click(screen.getByRole('button', { name: 'Adicionar bloco' }));
	await user.click(screen.getByRole('button', { name: /destaque de evento/i }));

	return { user };
}

describe('automatic event highlight editor', () => {
	it('creates a slider of recent events without asking for manual event content', async () => {
		const fetchMock = mockFetch([
			[`/pages/${pageId}/blocks`, () => jsonResponse({ id: 'new-block' }, { status: 201 })],
		]);
		const { user } = await openEditor();
		expect(screen.getByText(/eventos públicos publicados.*mais recentes/i)).toBeInTheDocument();
		expect(screen.queryByRole('textbox', { name: /título principal/i })).not.toBeInTheDocument();
		expect(screen.queryByRole('combobox', { name: 'Fundo' })).not.toBeInTheDocument();
		expect(screen.getByRole('combobox', { name: 'Exibição' })).toHaveTextContent('Slider');
		await user.clear(screen.getByLabelText('Quantidade de eventos'));
		await user.type(screen.getByLabelText('Quantidade de eventos'), '3');
		await user.click(screen.getByRole('combobox', { name: 'Foco da imagem' }));
		await user.click(screen.getByRole('option', { name: 'Centro' }));
		await user.click(screen.getByRole('button', { name: 'Adicionar bloco' }));
		await waitFor(() => expect(fetchMock).toHaveBeenCalled());
		const [, init] = fetchMock.mock.calls[0];
		expect(init?.method).toBe('POST');
		expect(JSON.parse(String(init?.body))).toMatchObject({
			collection: 'block_event_highlight',
			item: {
				display_mode: 'slider',
				max_items: 3,
				image_position: 'center',
				button_label: 'Comprar ingressos',
			},
		});
	});

	it('reports an empty call to action before saving', async () => {
		const fetchMock = mockFetch([]);
		const { user } = await openEditor();
		await user.clear(screen.getByLabelText(/texto do botão/i));
		await user.click(screen.getByRole('button', { name: 'Adicionar bloco' }));
		expect(screen.getByText('Informe o texto do botão.')).toBeInTheDocument();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('reopens the saved settings and allows switching to a single latest event', async () => {
		const item = {
			id: 'item',
			display_mode: 'slider' as const,
			max_items: 8,
			image_position: 'left' as const,
			button_label: 'Participar',
		};
		const fetchMock = mockFetch([[`/pages/${pageId}/blocks/saved`, () => jsonResponse({ id: 'saved' })]]);
		const { user } = renderWithProviders(
			<BlockBuilder
				pageId={pageId}
				blocks={[
					{
						id: 'saved',
						page: pageId,
						collection: 'block_event_highlight',
						item,
						background: 'dark',
						hide_block: false,
						sort: 1,
						date_created: '',
					},
				]}
			/>,
		);
		expect(screen.getByText('Últimos 8 eventos')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /usar fundo/i })).not.toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Editar Destaque de evento' }));
		expect(screen.getByLabelText('Quantidade de eventos')).toHaveValue(8);
		expect(screen.getByRole('combobox', { name: 'Foco da imagem' })).toHaveTextContent('Esquerda');
		await user.clear(screen.getByLabelText('Quantidade de eventos'));
		await user.click(screen.getByRole('combobox', { name: 'Exibição' }));
		await user.click(screen.getByRole('option', { name: 'Destaque único' }));
		expect(screen.queryByLabelText('Quantidade de eventos')).not.toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Salvar bloco' }));
		await waitFor(() => expect(fetchMock).toHaveBeenCalled());
		const [, init] = fetchMock.mock.calls[0];
		expect(init?.method).toBe('PATCH');
		expect(JSON.parse(String(init?.body))).toMatchObject({
			item: { display_mode: 'single', max_items: 1, image_position: 'left', button_label: 'Participar' },
		});
	});
});
