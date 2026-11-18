import { screen, waitFor } from '@testing-library/react';
import { it, expect } from 'vitest';
import { renderWithProviders, mockFetch, jsonResponse } from '@/test';
import { ManualPayoutPanel } from './ManualPayoutPanel';
it('requires a receipt and confirmation before recording a manual transfer as completed', async () => {
	const fetchMock = mockFetch([
		[/\/receipt$/, () => jsonResponse({ id: 'receipt-id', filename: 'receipt.pdf' })],
		[/\/complete$/, () => jsonResponse({ status: 'completed' })],
		[
			/manual-payouts/,
			() =>
				jsonResponse({
					data: [
						{
							id: 'payout-id',
							amount: 100,
							net_amount: 100,
							status: 'pending',
							requested_at: '2026-11-18T10:00:00Z',
							bank_account: {
								method: 'bank_transfer',
								holder_name: 'Ana Silva',
								holder_document: '52998224725',
								bank_code: '001',
								bank_name: 'Banco do Brasil',
								branch: '1234',
								account_number: '123456',
								account_digit: '7',
								account_type: 'checking',
							},
						},
					],
					pagination: { page: 1, limit: 10, total: 1, pageCount: 1 },
				}),
		],
	]);
	const { user } = renderWithProviders(<ManualPayoutPanel organizerId="org" />);
	expect(await screen.findByText('Ana Silva')).toBeInTheDocument();
	const finish = screen.getByRole('button', { name: 'Registrar transferência concluída' });
	expect(finish).toBeDisabled();
	await user.type(screen.getByLabelText('Referência da transferência'), 'TED-123');
	await user.upload(
		screen.getByLabelText('Comprovante da transferência'),
		new File(['%PDF-x'], 'receipt.pdf', { type: 'application/pdf' }),
	);
	await user.click(screen.getByRole('checkbox', { name: /Confirmo que a transferência foi realizada/ }));
	await user.click(finish);
	await waitFor(() =>
		expect(fetchMock).toHaveBeenCalledWith(
			'/api/super-admin/finance/payouts/payout-id/complete',
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ receipt_id: 'receipt-id', reference: 'TED-123', confirmed_transfer: true }),
			}),
		),
	);
});
