import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import { ListToolbar } from './ListToolbar';

const push = vi.fn();
const navigation = vi.hoisted(() => ({ params: new URLSearchParams('status=draft') }));
vi.mock('next/navigation', () => ({
	useRouter: () => ({ push, refresh: vi.fn() }),
	usePathname: () => '/super-admin/conteudo/paginas',
	useSearchParams: () => navigation.params,
}));

describe('ListToolbar', () => {
	it('writes the search into the URL, keeping the other filters and resetting the page', async () => {
		navigation.params = new URLSearchParams('status=draft&page=3');
		const { user } = renderWithProviders(<ListToolbar />);

		await user.click(screen.getByRole('button', { name: /Filtros/ }));
		await user.type(screen.getByLabelText(/buscar/i), 'sobre');
		expect(push).not.toHaveBeenCalled();
		await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));

		await waitFor(() => expect(push).toHaveBeenCalledWith('/super-admin/conteudo/paginas?status=draft&search=sobre'));
	});
	it('uses the same sheet for media searches without adding an irrelevant status field', async () => {
		navigation.params = new URLSearchParams('search=Logo&page=4');
		const { user } = renderWithProviders(<ListToolbar withStatus={false} placeholder="Buscar arquivo" />);
		await user.click(screen.getByRole('button', { name: /Filtros/ }));
		expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
		expect(screen.getByLabelText('Buscar')).toHaveValue('Logo');
		await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
		await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
		expect(push).toHaveBeenCalledExactlyOnceWith('/super-admin/conteudo/paginas');
	});
});
