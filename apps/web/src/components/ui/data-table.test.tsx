import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import { DataTable } from './data-table';
const columns = [
	{ accessorKey: 'name', header: 'Nome' },
	{ accessorKey: 'amount', header: 'Valor' },
];
const data = [
	{ name: 'Zélia', amount: 20 },
	{ name: 'Ana', amount: 5 },
];
describe('DataTable', () => {
	it('sorts numeric and text columns through accessible header buttons', async () => {
		const { user } = renderWithProviders(<DataTable columns={columns} data={data} />);
		await user.click(screen.getByRole('button', { name: 'Ordenar por Nome' }));
		expect(within(screen.getAllByRole('row')[1]).getByText('Ana')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Ordenar por Valor' }));
		expect(within(screen.getAllByRole('row')[1]).getByText('20')).toBeInTheDocument();
	});
	it('filters results and paginates with labeled controls', async () => {
		const { user } = renderWithProviders(
			<DataTable
				columns={columns}
				data={Array.from({ length: 12 }, (_, i) => ({ name: `Pessoa ${i}`, amount: i }))}
				searchKey="name"
				searchPlaceholder="Buscar pessoa"
			/>,
		);
		expect(screen.queryByText('Pessoa 11')).not.toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Próxima' }));
		expect(screen.getByText('Pessoa 11')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: /Filtros/ }));
		await user.type(screen.getByRole('textbox', { name: 'Buscar pessoa' }), 'inexistente');
		await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
		expect(screen.getByText('Nenhum resultado encontrado.')).toBeInTheDocument();
		expect(screen.getByText('Página 1 de 1')).toBeInTheDocument();
	});
});

it('uses the server total and delegates pagination and sorting across the complete result', async () => {
	const pageChanged = vi.fn();
	const sortChanged = vi.fn();
	const { user } = renderWithProviders(
		<DataTable
			columns={columns}
			data={data}
			serverPagination={{ state: { pageIndex: 0, pageSize: 20 }, rowCount: 42, onChange: pageChanged }}
			serverSorting={{ state: [], onChange: sortChanged }}
		/>,
	);
	expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
	await user.click(screen.getByRole('button', { name: 'Próxima' }));
	expect(pageChanged).toHaveBeenCalled();
	await user.click(screen.getByRole('button', { name: 'Ordenar por Nome' }));
	expect(sortChanged).toHaveBeenCalled();
	expect(within(screen.getAllByRole('row')[1]).getByText('Zélia')).toBeInTheDocument();
});

it('uses the visible column titles in the column chooser', async () => {
	const { user } = renderWithProviders(<DataTable columns={columns} data={data} />);
	await user.click(screen.getByRole('button', { name: 'Colunas' }));
	expect(screen.getByRole('menuitemcheckbox', { name: 'Nome' })).toBeInTheDocument();
	expect(screen.getByRole('menuitemcheckbox', { name: 'Valor' })).toBeInTheDocument();
});

it('opens a row from its cells without intercepting an embedded action', async () => {
	const open = vi.fn();
	const action = vi.fn();
	const { user } = renderWithProviders(
		<DataTable
			columns={[...columns, { id: 'action', cell: () => <button onClick={action}>Ação própria</button> }]}
			data={[data[0]]}
			onRowClick={open}
		/>,
	);
	await user.click(screen.getByText('Zélia'));
	expect(open).toHaveBeenCalledExactlyOnceWith(data[0]);
	await user.click(screen.getByRole('button', { name: 'Ação própria' }));
	expect(action).toHaveBeenCalledOnce();
	expect(open).toHaveBeenCalledOnce();
});
