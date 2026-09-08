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

		await user.type(screen.getByLabelText(/buscar/i), 'sobre');

		await waitFor(() => expect(push).toHaveBeenCalledWith('/super-admin/conteudo/paginas?status=draft&search=sobre'));
	});
});
