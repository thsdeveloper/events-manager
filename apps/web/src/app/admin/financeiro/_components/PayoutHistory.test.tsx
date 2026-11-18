import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test';
import PayoutHistory, { type PayoutSummary } from './PayoutHistory';

function renderHistory(receiptUrl: string | null) {
	const summary = {
		balance: { available: 0, pending: 0, currency: 'brl' },
		payouts: [
			{
				id: 'payout-1',
				amount: 50,
				currency: 'brl',
				status: 'completed',
				createdAt: null,
				arrivalDate: null,
				description: 'Transferência bancária',
				statementDescriptor: null,
				destination: null,
				receiptUrl,
			},
		],
	};
	renderWithProviders(
		<PayoutHistory
			summary={summary satisfies PayoutSummary}
			isLoading={false}
			currencyFormatter={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })}
		/>,
	);
}

describe('histórico de repasses do organizador', () => {
	it('permite consultar o comprovante privado de uma transferência concluída', () => {
		renderHistory('/api/organizer/receiving-accounts/org/payouts/payout-1/receipt');
		expect(screen.getByText('Concluído')).toBeInTheDocument();
		expect(screen.getByText('Transferência bancária')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Ver comprovante' })).toHaveAttribute(
			'href',
			'/api/organizer/receiving-accounts/org/payouts/payout-1/receipt',
		);
	});
	it.each([null, 'javascript:alert(1)', '//external.example/receipt'])(
		'não oferece comprovante inexistente ou URL insegura: %s',
		(url) => {
			renderHistory(url);
			expect(screen.queryByRole('link', { name: 'Ver comprovante' })).not.toBeInTheDocument();
		},
	);
});
