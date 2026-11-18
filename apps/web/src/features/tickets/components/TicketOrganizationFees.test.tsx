import { screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { renderWithProviders } from '@/test';
import { DEFAULT_PUBLIC_FEES } from '@/lib/fees';
import { TicketFeeDetails } from './TicketFeeDetails';

const props = {
	price: 100,
	serviceFeeType: 'passed_to_buyer' as const,
	feeConfig: { platformFeePercentage: 5, providerPercentageFee: 0, providerFixedFee: 0.8 },
	feeTable: DEFAULT_PUBLIC_FEES,
	isFallback: false,
};

it('offers only the organization methods and shows the Pix net by default', async () => {
	const { user } = renderWithProviders(
		<TicketFeeDetails
			{...props}
			paymentSettings={{
				settings: { accepted_payment_methods: ['PIX'], credit_card_settlement_period: null },
				available_methods: ['PIX'],
				pending_methods: [],
				gateway_card_settlement_period: 'D+1',
			}}
		/>,
	);
	await user.click(screen.getByRole('button', { name: 'Entender taxas e recebimento' }));
	const dialog = screen.getByRole('dialog');
	expect(within(dialog).getByText(/99,20/)).toBeInTheDocument();
	await user.click(within(dialog).getByRole('combobox', { name: 'Forma de pagamento da simulação' }));
	expect(screen.getByRole('option', { name: 'PIX' })).toBeInTheDocument();
	expect(screen.queryByRole('option', { name: 'Cartão de crédito' })).not.toBeInTheDocument();
});

it('calculates the exact chosen installment and requested credit period while explaining pending activation', async () => {
	const { user } = renderWithProviders(
		<TicketFeeDetails
			{...props}
			maxInstallments={6}
			paymentSettings={{
				settings: { accepted_payment_methods: ['CARD'], credit_card_settlement_period: 'D+7' },
				available_methods: [],
				pending_methods: [{ method: 'CARD', reason: 'settlement' }],
				gateway_card_settlement_period: 'D+1',
			}}
		/>,
	);
	await user.click(screen.getByRole('button', { name: 'Entender taxas e recebimento' }));
	await user.click(screen.getByRole('combobox', { name: 'Parcelas no cartão' }));
	await user.click(screen.getByRole('option', { name: '2x' }));
	expect(screen.getByText(/6,52% sobre/)).toBeInTheDocument();
	expect(screen.getByText(/92,55/)).toBeInTheDocument();
	expect(screen.getByText(/Recebendo em D\+7/)).toBeInTheDocument();
	expect(screen.getByText(/aguarda habilitação/i)).toBeInTheDocument();
	expect(screen.getByText(/21º saque/)).toBeInTheDocument();
});
