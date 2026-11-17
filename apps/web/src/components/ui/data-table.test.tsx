import { renderWithProviders } from '@/test';
import { screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { DataTable } from './data-table';

it('lets the organizer change page size through a named control and navigate results', async () => {
	const { user } = renderWithProviders(
		<DataTable
			columns={[{ accessorKey: 'title', header: 'Evento' }]}
			data={Array.from({ length: 25 }, (_, index) => ({ title: `Evento ${index + 1}` }))}
		/>,
	);
	await user.selectOptions(screen.getByRole('combobox', { name: 'Linhas por página' }), '20');
	expect(screen.getByRole('cell', { name: 'Evento 20' })).toBeInTheDocument();
	await user.click(screen.getByRole('button', { name: 'Próxima' }));
	expect(screen.getByRole('cell', { name: 'Evento 21' })).toBeInTheDocument();
	expect(screen.queryByRole('cell', { name: 'Evento 1' })).not.toBeInTheDocument();
});
