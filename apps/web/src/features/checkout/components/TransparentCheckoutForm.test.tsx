import { afterEach, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, mockFetch, jsonResponse } from '@/test';
import { TransparentCheckoutForm } from './TransparentCheckoutForm';
import { useCheckout } from '@/hooks/useCheckout';
import { Toaster } from '@/components/ui/toaster';
const cart = {
	eventId: 'event-1',
	tickets: [{ ticketId: 'ticket-1', quantity: 1 }],
	participantInfo: { name: 'Ana Silva', email: 'ana@example.test', phone: '11999999999', document: '52998224725' },
};
function View({ method = 'PIX' as 'PIX' | 'CARD' | 'BOLETO', buyer = cart.participantInfo }) {
	const checkout = useCheckout({ eventId: cart.eventId });

	return (
		<>
			<TransparentCheckoutForm
				cart={{ ...cart, participantInfo: buyer }}
				checkout={checkout}
				method={method}
				onMethodChange={() => {}}
				onBack={() => {}}
				onPixPlan={async () => {}}
			/>
			<Toaster />
		</>
	);
}
afterEach(() => {
	sessionStorage.clear();
	delete window.AbacatePay;
	vi.unstubAllGlobals();
});
it('charges the server quote rather than a price provided by the page', async () => {
	let sent: any;
	mockFetch([
		[
			'/api/payments/checkout/quote',
			() => jsonResponse({ amountInCents: 12345, maxInstallments: 1, methods: ['PIX'], publicKey: null }),
		],
		[
			'/api/payments/checkout',
			(_url, init) => {
				sent = JSON.parse(String(init?.body));

				return jsonResponse({ attemptId: sent.requestId, status: 'pending', payment: null });
			},
		],
		[/\/api\/payments\/attempts\//, () => jsonResponse({ status: 'pending', payment: null })],
	]);
	const { user } = renderWithProviders(<View />);
	await user.click(await screen.findByRole('button', { name: /Pagar R\$\s?123,45/ }));
	await waitFor(() => expect(sent?.expectedAmountInCents).toBe(12345));
});
it('tokenizes only on submit and passes only the token to our API', async () => {
	const tokenize = vi.fn().mockResolvedValue({ token: 'ctok_safe' });
	const destroy = vi.fn();
	const create = vi.fn(() => ({ mount: vi.fn().mockResolvedValue(undefined), tokenize, destroy, canTokenize: true }));
	window.AbacatePay = { create };
	let sent: any;
	mockFetch([
		[
			'/api/payments/checkout/quote',
			() => jsonResponse({ amountInCents: 11000, maxInstallments: 3, methods: ['CARD'], publicKey: 'pk_test' }),
		],
		[
			'/api/payments/checkout',
			(_url, init) => {
				sent = JSON.parse(String(init?.body));

				return jsonResponse({ attemptId: sent.requestId, status: 'pending', payment: null });
			},
		],
		[/\/api\/payments\/attempts\//, () => jsonResponse({ status: 'pending', payment: null })],
	]);
	const { user, unmount } = renderWithProviders(<View method="CARD" />);
	const button = await screen.findByRole('button', { name: /Pagar R\$\s?110,00/ });
	await waitFor(() => expect(button).toBeEnabled());
	expect(tokenize).not.toHaveBeenCalled();
	await user.click(button);
	expect(create).toHaveBeenCalledWith(expect.objectContaining({ amount: 11000, publicKey: 'pk_test' }));
	expect(sent).toMatchObject({ token: 'ctok_safe', paymentMethod: 'CARD', installments: 1 });
	expect(sent.cardNumber).toBeUndefined();
	unmount();
	expect(destroy).toHaveBeenCalled();
});
it('keeps the submit disabled if the secure form could not load', async () => {
	window.AbacatePay = {
		create: () => ({
			mount: vi.fn().mockRejectedValue(new Error('provider')),
			destroy: vi.fn(),
			tokenize: vi.fn(),
			canTokenize: false,
		}),
	};
	mockFetch([
		[
			'/api/payments/checkout/quote',
			() => jsonResponse({ amountInCents: 11000, maxInstallments: 1, methods: ['CARD'], publicKey: 'pk_test' }),
		],
	]);
	renderWithProviders(<View method="CARD" />);
	expect(await screen.findByText('Não foi possível carregar o formulário seguro do cartão.')).toBeInTheDocument();
	expect(screen.getByRole('button', { name: /Pagar R\$/ })).toBeDisabled();
});

it('keeps the profile document and phone read-only at the payment step', async () => {
	mockFetch([
		[
			'/api/payments/checkout/quote',
			() => jsonResponse({ amountInCents: 10000, maxInstallments: 1, methods: ['CARD'], publicKey: null, mock: true }),
		],
	]);
	renderWithProviders(<View method="CARD" />);
	expect(await screen.findByLabelText('CPF ou CNPJ do comprador *')).toHaveAttribute('readonly');
	expect(screen.getByLabelText('Celular do comprador *')).toHaveAttribute('readonly');
});

it.each(['phone', 'document'])(
	'requires completing missing %s in the profile before a card purchase',
	async (field) => {
		const fetchMock = mockFetch([
			[
				'/api/payments/checkout/quote',
				() =>
					jsonResponse({ amountInCents: 10000, maxInstallments: 1, methods: ['CARD'], publicKey: null, mock: true }),
			],
		]);
		const { user } = renderWithProviders(<View method="CARD" buyer={{ ...cart.participantInfo, [field]: '' }} />);
		const pay = await screen.findByRole('button', { name: /Pagar R\$/ });
		expect(pay).toBeDisabled();
		expect(screen.getByRole('link', { name: 'Atualizar meu perfil' })).toHaveAttribute(
			'href',
			'/perfil?section=personal',
		);
		await user.click(pay);
		expect(fetchMock.mock.calls.some(([url]) => url === '/api/payments/checkout')).toBe(false);
	},
);
