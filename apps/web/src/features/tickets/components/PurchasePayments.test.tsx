import { screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { mockFetch, jsonResponse, renderWithProviders } from '@/test';
import { buildNominalTicket } from '@/test/nominal-ticket';
import { PurchasePayments } from './PurchasePayments';
const ticket = buildNominalTicket({
	purchased_by_me: true,
	registration: {
		...buildNominalTicket().registration,
		status: 'pending',
		payment_status: 'pending',
		is_installment_payment: true,
		total_installments: 2,
	},
});
const pix = {
	provider_transaction_id: 'pix1',
	pix_copy_paste: 'PIX-CODE',
	pix_qr_code: 'data:image/png;base64,cGl4',
	amount: 50,
	expires_at: null,
};
const installments = [
	{
		id: 'i1',
		registration_id: 'r1',
		installment_number: 1,
		total_installments: 2,
		amount: 50,
		due_date: '2099-01-01',
		status: 'pending' as const,
		paid_at: null,
	},
];
it.each([true, false])(
	'shows the Pix and only offers automatic confirmation when the API permits it: %s',
	async (development) => {
		const refreshed = vi.fn();
		const fetch = mockFetch([
			[
				'/api/installments/i1/generate-pix',
				() =>
					jsonResponse({
						canSimulatePayment: development,
						payment: pix,
					}),
			],
			['/api/installments/i1/simulate-payment', () => jsonResponse({ confirmed: true })],
		]);
		const { user } = renderWithProviders(
			<PurchasePayments ticket={ticket} installments={installments} onRefresh={refreshed} />,
		);
		expect(await screen.findByDisplayValue('PIX-CODE')).toBeInTheDocument();
		if (development) {
			await user.click(screen.getByRole('button', { name: 'Confirmar parcela de teste' }));
			expect(refreshed).toHaveBeenCalled();
			expect(fetch).toHaveBeenCalledWith(
				'/api/installments/i1/simulate-payment',
				expect.objectContaining({ method: 'POST' }),
			);
		} else expect(screen.queryByRole('button', { name: 'Confirmar parcela de teste' })).not.toBeInTheDocument();
	},
);
it('lets the buyer retry after automatic Pix loading fails', async () => {
	let unavailable = true;
	mockFetch([
		[
			'/api/installments/i1/generate-pix',
			() =>
				unavailable ? jsonResponse({ detail: 'Pix indisponível.' }, { status: 503 }) : jsonResponse({ payment: pix }),
		],
	]);
	const { user } = renderWithProviders(<PurchasePayments ticket={ticket} installments={installments} />);
	expect(await screen.findByRole('alert')).toHaveTextContent('Pix indisponível.');
	expect(screen.getByRole('button', { name: 'Pagar parcela' })).toBeEnabled();
	unavailable = false;
	await user.click(screen.getByRole('button', { name: 'Pagar parcela' }));
	expect(await screen.findByDisplayValue('PIX-CODE')).toBeInTheDocument();
	expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it.each(['pending', 'overdue'] as const)(
	'opens the first %s installment QR code without a payment click',
	async (status) => {
		const fetch = mockFetch([['/api/installments/i1/generate-pix', () => jsonResponse({ payment: pix })]]);
		renderWithProviders(<PurchasePayments ticket={ticket} installments={[{ ...installments[0], status }]} />);
		expect(await screen.findByRole('img', { name: 'QR Code Pix para pagar esta compra' })).toHaveAttribute(
			'src',
			pix.pix_qr_code,
		);
		expect(screen.getByDisplayValue('PIX-CODE')).toBeInTheDocument();
		expect(fetch).toHaveBeenCalledExactlyOnceWith('/api/installments/i1/generate-pix', {
			method: 'POST',
			credentials: 'include',
		});
	},
);
it('opens the earliest unpaid installment and keeps a closed code closed across purchase refreshes', async () => {
	const fetch = mockFetch([['/api/installments/i2/generate-pix', () => jsonResponse({ payment: pix })]]);
	const plan = [
		{ ...installments[0], id: 'i3', installment_number: 3 },
		{ ...installments[0], status: 'paid' as const, paid_at: '2026-11-01T10:00:00Z' },
		{ ...installments[0], id: 'i2', installment_number: 2 },
	];
	const { user, rerender } = renderWithProviders(<PurchasePayments ticket={ticket} installments={plan} />);
	expect(await screen.findByDisplayValue('PIX-CODE')).toBeInTheDocument();
	expect(screen.getByText(/Pix da parcela 2/)).toBeInTheDocument();
	rerender(<PurchasePayments ticket={{ ...ticket }} installments={plan.map((item) => ({ ...item }))} />);
	expect(fetch).toHaveBeenCalledOnce();
	await user.click(screen.getByRole('button', { name: 'Fechar código' }));
	rerender(<PurchasePayments ticket={{ ...ticket }} installments={plan.map((item) => ({ ...item }))} />);
	expect(screen.queryByDisplayValue('PIX-CODE')).not.toBeInTheDocument();
	expect(fetch).toHaveBeenCalledOnce();
	const second = screen.getByText('Parcela 2').closest('li')!;
	await user.click(within(second).getByRole('button', { name: 'Pagar parcela' }));
	expect(await screen.findByDisplayValue('PIX-CODE')).toBeInTheDocument();
	expect(fetch).toHaveBeenCalledTimes(2);
});
it('opens the next pending installment after payment and hides the Pix when the purchase is settled', async () => {
	const fetch = mockFetch([
		['/api/installments/i1/generate-pix', () => jsonResponse({ payment: pix })],
		['/api/installments/i2/generate-pix', () => jsonResponse({ payment: { ...pix, pix_copy_paste: 'SECOND-PIX' } })],
	]);
	const plan = [installments[0], { ...installments[0], id: 'i2', installment_number: 2 }];
	const { rerender } = renderWithProviders(<PurchasePayments ticket={ticket} installments={plan} />);
	expect(await screen.findByDisplayValue('PIX-CODE')).toBeInTheDocument();
	const partiallyPaid = plan.map((item) => (item.id === 'i1' ? { ...item, status: 'paid' as const } : item));
	rerender(<PurchasePayments ticket={ticket} installments={partiallyPaid} />);
	expect(await screen.findByDisplayValue('SECOND-PIX')).toBeInTheDocument();
	expect(screen.queryByDisplayValue('PIX-CODE')).not.toBeInTheDocument();
	rerender(
		<PurchasePayments ticket={buildNominalTicket()} installments={plan.map((item) => ({ ...item, status: 'paid' }))} />,
	);
	expect(screen.queryByDisplayValue('SECOND-PIX')).not.toBeInTheDocument();
	expect(screen.queryByRole('button', { name: 'Pagar parcela' })).not.toBeInTheDocument();
	expect(fetch).toHaveBeenCalledTimes(2);
});
it.each([
	{ status: 'cancelled' },
	{ payment_status: 'refunded' },
	{ payment_status: 'paid' },
	{ payment_status: 'free' },
	{ payment_method: 'card', is_installment_payment: false },
	{ payment_method: 'boleto', is_installment_payment: false },
])('does not request Pix when the purchase cannot accept installment payments: %j', (registration) => {
	const fetch = mockFetch([]);
	renderWithProviders(
		<PurchasePayments
			ticket={{ ...ticket, registration: { ...ticket.registration, ...registration } }}
			installments={installments}
		/>,
	);
	expect(fetch).not.toHaveBeenCalled();
	expect(screen.queryByRole('button', { name: 'Pagar parcela' })).not.toBeInTheDocument();
});
it('removes an already displayed Pix if the purchase is cancelled', async () => {
	mockFetch([['/api/installments/i1/generate-pix', () => jsonResponse({ payment: pix })]]);
	const { rerender } = renderWithProviders(<PurchasePayments ticket={ticket} installments={installments} />);
	expect(await screen.findByDisplayValue('PIX-CODE')).toBeInTheDocument();
	rerender(
		<PurchasePayments
			ticket={{ ...ticket, registration: { ...ticket.registration, status: 'cancelled' } }}
			installments={installments}
		/>,
	);
	expect(screen.queryByDisplayValue('PIX-CODE')).not.toBeInTheDocument();
});
