import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test';
import PayoutHistory from './PayoutHistory';

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
describe('payout history', () => {
	it('announces an account warning alongside the balance', () => {
		renderWithProviders(
			<PayoutHistory
				isLoading={false}
				currencyFormatter={currencyFormatter}
				summary={{
					balance: { available: 50, pending: 20, currency: 'BRL' },
					payouts: [],
					alert: 'Configure sua chave Pix.',
				}}
			/>,
		);
		expect(screen.getByRole('alert')).toHaveTextContent('Configure sua chave Pix.');
		expect(screen.getByText(/Disponível: R\$\s?50,00/)).toBeInTheDocument();
	});
	it('keeps the transfer amount and translated status in the table', () => {
		renderWithProviders(
			<PayoutHistory
				isLoading={false}
				currencyFormatter={currencyFormatter}
				summary={{
					balance: { available: 0, pending: 0, currency: 'BRL' },
					payouts: [
						{
							id: 'payout-1',
							amount: 50,
							currency: 'BRL',
							status: 'paid',
							createdAt: null,
							arrivalDate: null,
							description: null,
							statementDescriptor: null,
							destination: null,
						},
					],
				}}
			/>,
		);
		const table = screen.getByRole('table');
		expect(within(table).getByRole('cell', { name: 'Pago' })).toBeInTheDocument();
		expect(within(table).getByRole('cell', { name: /R\$\s?50,00/ })).toBeInTheDocument();
	});
});
