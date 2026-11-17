import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import TransactionsTable from './TransactionsTable';

describe('TransactionsTable', () => {
	it('shows a standard empty state when no transaction matches the filters', () => {
		const { container } = renderWithProviders(
			<TransactionsTable
				rows={[]}
				isLoading={false}
				pagination={{ page: 1, limit: 20, total: 0, pageCount: 0 }}
				onPageChange={vi.fn()}
				onSortChange={vi.fn()}
				sort={{ field: 'date', direction: 'desc' }}
				currencyFormatter={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })}
			/>,
		);

		expect(screen.getByText(/nenhuma transação encontrada/i)).toBeInTheDocument();
		expect(container.querySelector('img')).not.toBeInTheDocument();
	});
});
