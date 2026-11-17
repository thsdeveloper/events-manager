import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import { QueryFilterSheet } from './QueryFilterSheet';
const push = vi.fn();
const navigation = vi.hoisted(() => ({ params: new URLSearchParams('search=Ana&status=pending&page=3&view=grid') }));
vi.mock('next/navigation', () => ({
	useRouter: () => ({ push }),
	usePathname: () => '/super-admin/organizadores',
	useSearchParams: () => navigation.params,
}));
const fields = [
	{ name: 'search', label: 'Busca', type: 'search' as const },
	{
		name: 'status',
		label: 'Status',
		type: 'select' as const,
		options: [
			{ value: '', label: 'Todos' },
			{ value: 'pending', label: 'Pendentes' },
			{ value: 'active', label: 'Ativos' },
		],
	},
];
describe('QueryFilterSheet', () => {
	it('updates its own parameters once, preserving unrelated parameters and resetting pagination', async () => {
		navigation.params = new URLSearchParams('search=Ana&status=pending&page=3&view=grid');
		const { user } = renderWithProviders(<QueryFilterSheet fields={fields} />);
		await user.click(screen.getByRole('button', { name: /Filtros/ }));
		await user.click(screen.getByRole('combobox', { name: 'Status' }));
		await user.click(screen.getByRole('option', { name: 'Ativos' }));
		expect(push).not.toHaveBeenCalled();
		await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
		expect(push).toHaveBeenCalledExactlyOnceWith('/super-admin/organizadores?search=Ana&status=active&view=grid');
	});
	it('clears only the defined filters and reloads values from browser navigation on reopening', async () => {
		navigation.params = new URLSearchParams('search=Ana&status=pending&page=3&view=grid');
		const { user, rerender } = renderWithProviders(<QueryFilterSheet fields={fields} />);
		await user.click(screen.getByRole('button', { name: /Filtros/ }));
		await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
		await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
		expect(push).toHaveBeenCalledWith('/super-admin/organizadores?view=grid');
		navigation.params = new URLSearchParams('search=Bia&status=active');
		rerender(<QueryFilterSheet fields={fields} />);
		await user.click(screen.getByRole('button', { name: /Filtros/ }));
		expect(screen.getByLabelText('Busca')).toHaveValue('Bia');
		expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('Ativos');
	});
});
it('uses the shared calendar for date parameters and preserves a local ISO date in the URL', async () => {
	navigation.params = new URLSearchParams('from=2026-11-17&page=2');
	const { user } = renderWithProviders(
		<QueryFilterSheet fields={[{ name: 'from', label: 'Data inicial', type: 'date' }]} />,
	);
	await user.click(screen.getByRole('button', { name: /Filtros/ }));
	await user.click(screen.getByRole('button', { name: 'Data inicial' }));
	await user.click(screen.getByRole('button', { name: /18 de novembro de 2026/i }));
	await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
	expect(push).toHaveBeenCalledWith('/super-admin/organizadores?from=2026-11-18');
});
