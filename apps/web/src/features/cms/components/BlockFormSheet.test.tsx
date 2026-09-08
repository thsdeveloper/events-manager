import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, problemResponse, renderWithProviders } from '@/test';
import { BlockFormSheet } from './BlockFormSheet';

vi.mock('next/image', () => ({
	default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}));

afterEach(() => vi.unstubAllGlobals());

const pageId = '20000000-0000-0000-0000-000000000001';

describe('BlockFormSheet (hero)', () => {
	it('refuses to send a hero without a headline and points at the field', async () => {
		const fetchMock = mockFetch([]);
		const { user } = renderWithProviders(
			<BlockFormSheet
				open
				onOpenChange={vi.fn()}
				pageId={pageId}
				collection="block_hero"
				block={null}
				onSaved={vi.fn()}
			/>,
		);

		await user.click(await screen.findByRole('button', { name: /adicionar bloco/i }));

		expect(await screen.findByText('Informe o título principal.')).toBeInTheDocument();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('creates the hero with its buttons through the page blocks endpoint', { timeout: 20_000 }, async () => {
		const fetchMock = mockFetch([
			[`/api/super-admin/cms/pages/${pageId}/blocks`, () => jsonResponse({ id: 'b1' }, { status: 201 })],
		]);
		const onSaved = vi.fn();
		const { user } = renderWithProviders(
			<BlockFormSheet
				open
				onOpenChange={vi.fn()}
				pageId={pageId}
				collection="block_hero"
				block={null}
				onSaved={onSaved}
			/>,
		);

		await user.click(screen.getByLabelText(/título principal/i));
		await user.paste('Eventos que viram histórias');
		await user.click(screen.getByRole('button', { name: /adicionar botão/i }));
		const button = screen.getByRole('group', { name: /botão 1/i });
		await user.type(within(button).getByLabelText(/texto/i), 'Explorar');
		await user.type(within(button).getByLabelText(/endereço/i), '/eventos');
		await user.click(screen.getByRole('button', { name: /adicionar bloco/i }));

		await waitFor(() => expect(onSaved).toHaveBeenCalled());
		const [, init] = fetchMock.mock.calls[0];
		expect(init?.method).toBe('POST');
		expect(JSON.parse(String(init?.body))).toMatchObject({
			collection: 'block_hero',
			background: 'light',
			hide_block: false,
			item: {
				headline: 'Eventos que viram histórias',
				layout: 'image_right',
				buttons: [{ label: 'Explorar', type: 'url', url: '/eventos', variant: 'default' }],
			},
		});
	});

	it('shows the field messages returned by the API when it rejects the block', async () => {
		mockFetch([
			[
				`/api/super-admin/cms/pages/${pageId}/blocks`,
				() =>
					problemResponse(422, 'VALIDATION_ERROR', 'Dados inválidos.', {
						errors: { fieldErrors: { headline: ['Título já usado nesta página.'] }, formErrors: [] },
					}),
			],
		]);
		const { user } = renderWithProviders(
			<BlockFormSheet
				open
				onOpenChange={vi.fn()}
				pageId={pageId}
				collection="block_hero"
				block={null}
				onSaved={vi.fn()}
			/>,
		);

		await user.type(screen.getByLabelText(/título principal/i), 'Olá');
		await user.click(screen.getByRole('button', { name: /adicionar bloco/i }));

		expect(await screen.findByText('Título já usado nesta página.')).toBeInTheDocument();
	});
});
