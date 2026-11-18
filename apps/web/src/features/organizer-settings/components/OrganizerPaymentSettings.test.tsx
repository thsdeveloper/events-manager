import { renderAsOwner } from '@/test/permissions';
import { DEFAULT_GATEWAY_FEES } from '@events-manager/contracts';
import { screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, problemResponse } from '@/test';
import { Toaster } from '@/components/ui/toaster';
import { OrganizerPaymentSettings } from './OrganizerPaymentSettings';

afterEach(() => vi.unstubAllGlobals());
const initial = {
	settings: { accepted_payment_methods: ['PIX'], credit_card_settlement_period: null },
	available_methods: ['PIX'],
	pending_methods: [],
	gateway_card_settlement_period: 'D+1',
};
it('starts with only Pix checked and saves multiple methods with a requested credit period', async () => {
	let saved: Record<string, unknown> | undefined;
	mockFetch([
		['/api/content/fees', () => jsonResponse(DEFAULT_GATEWAY_FEES)],
		[
			'/api/organizer/payment-settings',
			async (_url, init) => {
				if (init?.method !== 'PATCH') return jsonResponse(initial);
				saved = JSON.parse(String(init.body));

				return jsonResponse({
					...initial,
					settings: saved,
					pending_methods: [{ method: 'CARD', reason: 'settlement' }],
				});
			},
		],
	]);
	const { user } = renderAsOwner(<OrganizerPaymentSettings />);
	expect(await screen.findByRole('checkbox', { name: 'Pix' })).toBeChecked();
	expect(screen.getByRole('checkbox', { name: 'Cartão de crédito' })).not.toBeChecked();
	await user.click(screen.getByRole('checkbox', { name: 'Cartão de crédito' }));
	await user.click(screen.getByRole('radio', { name: /Recebendo em D\+7/ }));
	await user.click(screen.getByRole('checkbox', { name: 'Boleto' }));
	await user.click(screen.getByRole('button', { name: 'Salvar formas de pagamento' }));
	await waitFor(() =>
		expect(saved).toEqual({
			accepted_payment_methods: ['PIX', 'CARD', 'BOLETO'],
			credit_card_settlement_period: 'D+7',
		}),
	);
	expect(await screen.findByText(/Crédito pendente: o prazo solicitado/i)).toBeInTheDocument();
});

it('requires a credit period and displays validation using the standard toast', async () => {
	mockFetch([
		['/api/content/fees', () => jsonResponse(DEFAULT_GATEWAY_FEES)],
		['/api/organizer/payment-settings', () => jsonResponse(initial)],
	]);
	const { user } = renderAsOwner(
		<>
			<OrganizerPaymentSettings />
			<Toaster />
		</>,
	);
	await user.click(await screen.findByRole('checkbox', { name: 'Cartão de crédito' }));
	await user.click(screen.getByRole('button', { name: 'Salvar formas de pagamento' }));
	expect(await screen.findByText('Escolha quando deseja receber as vendas no cartão de crédito.')).toBeInTheDocument();
});

it('does not present defaults as saved preferences when loading fails', async () => {
	mockFetch([
		['/api/content/fees', () => jsonResponse(DEFAULT_GATEWAY_FEES)],
		['/api/organizer/payment-settings', () => problemResponse(503, 'UNAVAILABLE')],
	]);
	renderAsOwner(<OrganizerPaymentSettings />);
	expect(await screen.findByText(/Não foi possível carregar as formas de pagamento/)).toBeInTheDocument();
	expect(screen.queryByRole('button', { name: 'Salvar formas de pagamento' })).not.toBeInTheDocument();
});

it('requires at least one method without discarding the draft', async () => {
	mockFetch([
		['/api/content/fees', () => jsonResponse(DEFAULT_GATEWAY_FEES)],
		['/api/organizer/payment-settings', () => jsonResponse(initial)],
	]);
	const { user } = renderAsOwner(
		<>
			<OrganizerPaymentSettings />
			<Toaster />
		</>,
	);
	await user.click(await screen.findByRole('checkbox', { name: 'Pix' }));
	await user.click(screen.getByRole('button', { name: 'Salvar formas de pagamento' }));
	expect(await screen.findByText('Selecione pelo menos uma forma de pagamento.')).toBeInTheDocument();
	expect(screen.getByRole('checkbox', { name: 'Pix' })).not.toBeChecked();
});
it('keeps a requested debit preference pending and preserves edits if saving fails', async () => {
	mockFetch([
		['/api/content/fees', () => jsonResponse(DEFAULT_GATEWAY_FEES)],
		[
			'/api/organizer/payment-settings',
			(_url, init) =>
				init?.method === 'PATCH'
					? problemResponse(409, 'CHANGED', 'A organização foi alterada. Recarregue a página.')
					: jsonResponse({
							...initial,
							settings: { accepted_payment_methods: ['DEBIT'], credit_card_settlement_period: null },
							available_methods: [],
							pending_methods: [{ method: 'DEBIT', reason: 'integration' }],
						}),
		],
	]);
	const { user } = renderAsOwner(
		<>
			<OrganizerPaymentSettings />
			<Toaster />
		</>,
	);
	expect(await screen.findByText(/Cartão de débito pendente:/)).toBeInTheDocument();
	await user.click(screen.getByRole('checkbox', { name: 'Pix' }));
	await user.click(screen.getByRole('button', { name: 'Salvar formas de pagamento' }));
	expect(await screen.findByText('A organização foi alterada. Recarregue a página.')).toBeInTheDocument();
	expect(screen.getByRole('checkbox', { name: 'Pix' })).toBeChecked();
});
