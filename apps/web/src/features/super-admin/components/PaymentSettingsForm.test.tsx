import { DEFAULT_GATEWAY_FEES } from '@events-manager/contracts';
import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, renderWithProviders, problemResponse } from '@/test';
import { PaymentSettingsForm } from './PaymentSettingsForm';

afterEach(() => vi.unstubAllGlobals());
const settings = {
	...DEFAULT_GATEWAY_FEES,
	platform_fee_percentage: 5,
	platform_fee_minimum: 0,
	minimum_payout: 3.5,
	payouts_enabled: false,
	convenience_fee_calculation_method: 'buyer_pays',
	gateway_card_settlement_period: 'D+1',
};

it('separates platform fees from receiving, withdrawals and free gateway operations', () => {
	renderWithProviders(<PaymentSettingsForm initialSettings={settings} runtimeProvider="mock" />);
	expect(
		within(screen.getByRole('group', { name: 'Taxas da plataforma' })).getByLabelText('Taxa da plataforma (%)'),
	).toHaveValue(5);
	expect(
		(
			within(screen.getByRole('group', { name: 'Taxas do gateway — AbacatePay' })).getByLabelText(
				'Pix recebido',
			) as HTMLInputElement
		).value,
	).toMatch(/0,80/);
	expect(screen.getByLabelText('D+7 · 2 parcelas (%)')).toHaveValue(6.52);
	expect(screen.getByLabelText('D+30 · 12 parcelas (%)')).toHaveValue(15.45);
	expect(screen.getByText(/boleto pago pelo Pix usa a tarifa do Pix/i)).toBeInTheDocument();
});

it('saves an exact installment rate and the distinct withdrawal fees', async () => {
	let payload: Record<string, unknown> | undefined;
	mockFetch([
		[
			'/api/super-admin/settings/payments',
			async (_url, init) => {
				payload = JSON.parse(String(init?.body));

				return jsonResponse({ settings: payload });
			},
		],
	]);
	const { user } = renderWithProviders(<PaymentSettingsForm initialSettings={settings} runtimeProvider="mock" />);
	const rate = screen.getByLabelText('D+7 · 2 parcelas (%)');
	await user.clear(rate);
	await user.type(rate, '6.25');
	await user.click(screen.getByRole('button', { name: 'Salvar configurações' }));
	await waitFor(() =>
		expect(payload).toMatchObject({
			platform_fee_percentage: 5,
			payout_pix_monthly_limit: 20,
			payout_pix_excess_fee: 2.5,
			ted_fee_fixed: 5,
		}),
	);
	expect((payload!.card_rates as Record<string, number[]>)['D+7'][1]).toBe(6.25);
});

import { Toaster } from '@/components/ui/toaster';
it('shows API validation details in the standard toast and keeps the entered fees', async () => {
	mockFetch([
		[
			'/api/super-admin/settings/payments',
			() =>
				problemResponse(422, 'VALIDATION_ERROR', 'Dados inválidos.', {
					errors: { fieldErrors: { card_rates: ['Revise a taxa para duas parcelas.'] } },
				}),
		],
	]);
	const { user } = renderWithProviders(
		<>
			<PaymentSettingsForm initialSettings={settings} runtimeProvider="abacatepay" />
			<Toaster />
		</>,
	);
	const rate = screen.getByLabelText('D+7 · 2 parcelas (%)');
	await user.clear(rate);
	await user.type(rate, '6.25');
	await user.click(screen.getByRole('button', { name: 'Salvar configurações' }));
	expect(await screen.findByText('Revise a taxa para duas parcelas.')).toBeInTheDocument();
	expect(rate).toHaveValue(6.25);
	expect(screen.getByRole('button', { name: 'Salvar configurações' })).toBeEnabled();
});
