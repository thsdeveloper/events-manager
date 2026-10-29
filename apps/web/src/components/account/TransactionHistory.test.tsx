import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, renderWithProviders } from '@/test';
import { TransactionHistory } from './TransactionHistory';

afterEach(() => vi.unstubAllGlobals());

describe('TransactionHistory', () => {
	it('explains where payments will appear when there are none yet', async () => {
		mockFetch([['/api/user/transactions', () => jsonResponse([])]]);

		const { container } = renderWithProviders(<TransactionHistory userId="u1" />);

		expect(await screen.findByRole('heading', { name: 'Nenhum pagamento por aqui' })).toBeInTheDocument();
		expect(container.querySelector('img[aria-hidden="true"]')).toHaveAttribute('src', '/images/empty/payments.svg');
		expect(screen.getByText(/dados da transação e do recibo/i)).toBeInTheDocument();
	});
});
