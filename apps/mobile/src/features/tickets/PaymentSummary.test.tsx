import { render, screen } from '@testing-library/react-native';
import type { TicketPurchaseDetails } from '@events-manager/contracts';
import { PaymentSummary } from './PaymentSummary';
const purchase = {
	id: 'purchase',
	tickets: [
		{
			registration: {
				id: 'order',
				payment_method: 'PIX',
				payment_status: 'partial',
				status: 'pending',
				is_installment_payment: true,
				total_amount: 120,
			},
		},
	],
	installments: [
		{ id: 'i1', installment_number: 1, total_installments: 2, amount: 60, due_date: '2027-01-01', status: 'paid' },
		{ id: 'i2', installment_number: 2, total_installments: 2, amount: 60, due_date: '2027-02-01', status: 'pending' },
	],
} as TicketPurchaseDetails;
it('shows paid and outstanding Pix installments without calling the purchase confirmed', async () => {
	await render(<PaymentSummary purchase={purchase} />);
	expect(screen.getByText('Pix parcelado')).toBeTruthy();
	expect(screen.getByText('1 de 2 parcelas pagas')).toBeTruthy();
	expect(screen.getByText('A pagar')).toBeTruthy();
	expect(screen.queryByText('Compra confirmada')).toBeNull();
});
it('explains that credit card installments are paid to the bank', async () => {
	await render(
		<PaymentSummary
			purchase={{
				...purchase,
				installments: [],
				tickets: [
					{
						...purchase.tickets[0],
						registration: {
							...purchase.tickets[0].registration,
							payment_method: 'CREDIT_CARD',
							payment_status: 'paid',
							status: 'confirmed',
							is_installment_payment: false,
							card_installments: 3,
						},
					},
				],
			}}
		/>,
	);
	expect(screen.getByText('Cartão de crédito · 3x')).toBeTruthy();
	expect(screen.getByText(/fatura do seu cartão/)).toBeTruthy();
});
