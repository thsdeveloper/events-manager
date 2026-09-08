import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, renderWithProviders } from '@/test';
import { FeeCalculator } from './FeeCalculator';

afterEach(() => vi.unstubAllGlobals());

const fees = {
	platform_fee_percentage: 5,
	pix_fee_fixed: 0.8,
	card_fee_percentage: 3.5,
	card_fee_fixed: 0.6,
	card_installment_2_6_percentage: 4,
	card_installment_7_12_percentage: 4.5,
	boleto_fee_fixed: 2.5,
	payout_fee_fixed: 0.8,
	minimum_payout: 3.5,
	convenience_fee_calculation_method: 'buyer_pays',
};

function renderCalculator() {
	mockFetch([['/api/content/fees', () => jsonResponse(fees)]]);

	return renderWithProviders(<FeeCalculator />);
}

describe('FeeCalculator', () => {
	it('shows what the buyer pays and what the organizer receives for the chosen method', async () => {
		const { user } = renderCalculator();

		await waitFor(() => expect(screen.getByTestId('calculator-organizer-receives')).toHaveTextContent('R$ 95,73'));
		expect(screen.getByTestId('calculator-buyer-pays')).toHaveTextContent('R$ 105,00');

		await user.click(screen.getByRole('radio', { name: /^pix/i }));
		expect(screen.getByTestId('calculator-organizer-receives')).toHaveTextContent('R$ 99,20');

		await user.click(screen.getByRole('radio', { name: /eu absorvo/i }));
		expect(screen.getByTestId('calculator-buyer-pays')).toHaveTextContent('R$ 100,00');
		expect(screen.getByTestId('calculator-organizer-receives')).toHaveTextContent('R$ 94,20');
	});

	it('projects the total for the number of tickets typed', async () => {
		const { user } = renderCalculator();
		await waitFor(() => expect(screen.getByTestId('calculator-organizer-receives')).toHaveTextContent('R$ 95,73'));

		const quantity = screen.getByLabelText(/quantidade de ingressos/i);
		await user.clear(quantity);
		await user.type(quantity, '50');

		expect(screen.getByTestId('calculator-total-receives')).toHaveTextContent('R$ 4.786,50');
	});

	it('lists every published rate in the fee table', async () => {
		renderCalculator();

		const table = await screen.findByRole('table', { name: /tabela de taxas/i });
		expect(table).toHaveTextContent(/5%/);
		expect(table).toHaveTextContent(/R\$ 0,80/);
		expect(table).toHaveTextContent(/3,5%/);
		expect(table).toHaveTextContent(/4,5%/);
		expect(table).toHaveTextContent(/R\$ 2,50/);
		expect(table).toHaveTextContent(/R\$ 3,50/);
	});
});
