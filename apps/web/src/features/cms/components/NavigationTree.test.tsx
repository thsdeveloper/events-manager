import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, problemResponse, renderWithProviders } from '@/test';
import type { CmsNavigationDetail } from '../types';
import { NavigationTree } from './NavigationTree';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
const revalidate = vi.hoisted(() => vi.fn());
vi.mock('../api/actions', () => ({ revalidateCmsContent: revalidate }));

afterEach(() => vi.unstubAllGlobals());

const parentId = '30000000-0000-0000-0000-000000000001';
const siblingId = '30000000-0000-0000-0000-000000000002';

const navigation: CmsNavigationDetail = {
	id: 'main',
	title: 'Navegação principal',
	is_active: true,
	date_created: '2026-09-01T00:00:00Z',
	date_updated: null,
	items: [
		{
			id: parentId,
			navigation: 'main',
			parent: null,
			title: 'Institucional',
			type: 'group',
			url: null,
			sort: 1,
			page: null,
			post: null,
			children: [],
		},
		{
			id: siblingId,
			navigation: 'main',
			parent: null,
			title: 'Eventos',
			type: 'url',
			url: '/eventos',
			sort: 2,
			page: null,
			post: null,
			children: [],
		},
	],
};

describe('NavigationTree', () => {
	it('creates a child item under the chosen parent', async () => {
		const fetchMock = mockFetch([
			['/api/super-admin/cms/navigation/main/items', () => jsonResponse({ id: 'new' }, { status: 201 })],
		]);
		const { user } = renderWithProviders(<NavigationTree navigation={navigation} />);

		await user.click(screen.getByRole('button', { name: /adicionar subitem em institucional/i }));
		const dialog = await screen.findByRole('dialog');
		await user.type(within(dialog).getByLabelText(/rótulo/i), 'Sobre');
		await user.type(within(dialog).getByLabelText(/endereço/i), '/sobre');
		await user.click(within(dialog).getByRole('button', { name: /salvar item/i }));

		await waitFor(() => expect(refresh).toHaveBeenCalled());
		const [, init] = fetchMock.mock.calls[0];
		expect(init?.method).toBe('POST');
		expect(JSON.parse(String(init?.body))).toEqual({
			title: 'Sobre',
			type: 'url',
			url: '/sobre',
			page: null,
			post: null,
			parent: parentId,
		});
		expect(revalidate).toHaveBeenCalled();
	});

	it('reorders siblings under the same parent', async () => {
		const fetchMock = mockFetch([
			['/api/super-admin/cms/navigation/main/items/order', () => jsonResponse({ success: true })],
		]);
		const { user } = renderWithProviders(<NavigationTree navigation={navigation} />);

		await user.click(screen.getByRole('button', { name: /mover eventos para cima/i }));

		await waitFor(() => expect(refresh).toHaveBeenCalled());
		const [, init] = fetchMock.mock.calls[0];
		expect(init?.method).toBe('PUT');
		expect(JSON.parse(String(init?.body))).toEqual({ parent: null, order: [siblingId, parentId] });
	});

	it('toggles the menu, moves items, opens the editor and removes an item after confirmation', async () => {
		const fetchMock = mockFetch([
			['/api/super-admin/cms/navigation/main/items/order', () => jsonResponse({ success: true })],
			[`/api/super-admin/cms/navigation/main/items/${siblingId}`, () => jsonResponse({ success: true })],
			['/api/super-admin/cms/navigation/main', () => jsonResponse({ ...navigation, is_active: false })],
		]);
		const { user } = renderWithProviders(<NavigationTree navigation={navigation} />);

		await user.click(screen.getByRole('switch', { name: /menu ativo/i }));
		await waitFor(() =>
			expect(JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1]?.body))).toEqual({
				title: 'Navegação principal',
				is_active: false,
			}),
		);

		await user.click(screen.getByRole('button', { name: /mover institucional para baixo/i }));
		await waitFor(() =>
			expect(JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1]?.body))).toEqual({
				parent: null,
				order: [siblingId, parentId],
			}),
		);

		await user.click(screen.getByRole('button', { name: /editar eventos/i }));
		const dialog = await screen.findByRole('dialog');
		expect(within(dialog).getByLabelText(/rótulo/i)).toHaveValue('Eventos');
		await user.keyboard('{Escape}');

		await user.click(screen.getByRole('button', { name: /adicionar item/i }));
		expect(await screen.findByRole('dialog')).toHaveTextContent(/novo item/i);
		await user.keyboard('{Escape}');

		await user.click(screen.getByRole('button', { name: /excluir eventos/i }));
		await user.click(await screen.findByRole('button', { name: /^remover$/i }));
		await waitFor(() => expect(fetchMock.mock.calls.at(-1)?.[1]?.method).toBe('DELETE'));
		expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain(`/navigation/main/items/${siblingId}`);
	});

	it('shows an empty state and reports a failed mutation', async () => {
		mockFetch([['/api/super-admin/cms/navigation/main', () => problemResponse(500, 'INTERNAL_ERROR', 'Falhou')]]);
		const { user } = renderWithProviders(<NavigationTree navigation={{ ...navigation, items: [] }} />);
		refresh.mockClear();

		expect(screen.getByText(/ainda não tem itens/i)).toBeInTheDocument();
		await user.click(screen.getByRole('switch', { name: /menu ativo/i }));

		await waitFor(() => expect(screen.getByRole('switch', { name: /menu ativo/i })).toBeEnabled());
		expect(refresh).not.toHaveBeenCalled();
	});
});
