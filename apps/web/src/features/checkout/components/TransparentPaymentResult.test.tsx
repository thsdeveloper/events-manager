import { expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { jsonResponse, mockFetch, problemResponse, renderWithProviders } from '@/test';
import { TransparentPaymentResult } from './TransparentPaymentResult';
const payment = {
	id: 'pix_1',
	method: 'PIX' as const,
	status: 'PENDING',
	amountInCents: 11000,
	copyPasteCode: '000201-PIX',
	qrCodeBase64: null,
	barcode: null,
	boletoUrl: null,
	expiresAt: null,
};
it.each(['PIX', 'BOLETO', 'CARD'] as const)('offers development confirmation for a pending %s', async (method) => {
	renderWithProviders(
		<TransparentPaymentResult
			result={{ attemptId: 'a', status: 'pending', payment: { ...payment, method }, canSimulatePayment: true }}
			onRefresh={() => {}}
			onReset={() => {}}
		/>,
	);
	expect(screen.getByRole('button', { name: 'Confirmar pagamento de teste' })).toBeEnabled();
});
it('shows a receipt summary and clear next steps after confirmation', () => {
	renderWithProviders(
		<TransparentPaymentResult
			result={{ attemptId: 'a', status: 'confirmed', payment }}
			onRefresh={() => {}}
			onReset={() => {}}
		/>,
	);
	expect(screen.getByRole('heading', { name: 'Compra confirmada!' })).toBeInTheDocument();
	expect(screen.getByText('Total pago')).toBeInTheDocument();
	expect(screen.getByRole('link', { name: /explorar eventos/i })).toHaveAttribute('href', '/eventos');
	expect(screen.queryByRole('button', { name: 'Verificar pagamento' })).not.toBeInTheDocument();
});
it('identifies a locally confirmed test purchase without implying a real payment', () => {
	renderWithProviders(
		<TransparentPaymentResult
			result={{ attemptId: 'a', status: 'confirmed', payment: { ...payment, developmentSimulation: true } }}
			onRefresh={() => {}}
			onReset={() => {}}
		/>,
	);
	expect(screen.getByText('Compra de teste')).toBeInTheDocument();
});
it('simulates a development Pix and refreshes confirmation from the backend', async () => {
	const refresh = vi.fn();
	const network = mockFetch([
		['/api/payments/attempts/a/simulate-payment', () => jsonResponse({ attemptId: 'a', status: 'confirmed', payment })],
	]);
	const { user } = renderWithProviders(
		<TransparentPaymentResult
			result={{ attemptId: 'a', status: 'pending', payment, canSimulatePayment: true }}
			onRefresh={refresh}
			onReset={() => {}}
		/>,
	);
	expect(screen.getByText(/ambiente de testes/i)).toBeInTheDocument();
	await user.click(screen.getByRole('button', { name: 'Confirmar pagamento de teste' }));
	await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
	expect(network).toHaveBeenCalledWith(
		'/api/payments/attempts/a/simulate-payment',
		expect.objectContaining({ method: 'POST', credentials: 'include' }),
	);
	expect(screen.queryByRole('heading', { name: 'Compra confirmada!' })).not.toBeInTheDocument();
});
it.each([
	{ canSimulatePayment: false, status: 'pending' as const, method: 'PIX' as const },
	{ canSimulatePayment: undefined, status: 'pending' as const, method: 'PIX' as const },
	{ canSimulatePayment: true, status: 'confirmed' as const, method: 'PIX' as const },
	{ canSimulatePayment: true, status: 'processing' as const, method: 'PIX' as const },
	{ canSimulatePayment: true, status: 'cancelled' as const, method: 'PIX' as const },
])('only offers simulation when the API permits a pending Pix: %j', ({ method, ...result }) => {
	renderWithProviders(
		<TransparentPaymentResult
			result={{ attemptId: 'a', ...result, payment: { ...payment, method } }}
			onRefresh={() => {}}
			onReset={() => {}}
		/>,
	);
	expect(screen.queryByRole('button', { name: 'Confirmar pagamento de teste' })).not.toBeInTheDocument();
});
it('prevents repeated clicks while simulation is in progress', async () => {
	let finish!: () => void;
	const network = mockFetch([
		[
			'/api/payments/attempts/a/simulate-payment',
			async () => {
				await new Promise<void>((resolve) => {
					finish = resolve;
				});

				return jsonResponse({ attemptId: 'a', status: 'confirmed', payment });
			},
		],
	]);
	const { user } = renderWithProviders(
		<TransparentPaymentResult
			result={{ attemptId: 'a', status: 'pending', payment, canSimulatePayment: true }}
			onRefresh={() => {}}
			onReset={() => {}}
		/>,
	);
	await user.click(screen.getByRole('button', { name: 'Confirmar pagamento de teste' }));
	expect(screen.getByRole('button', { name: 'Confirmando…' })).toBeDisabled();
	await user.click(screen.getByRole('button', { name: 'Confirmando…' }));
	expect(network).toHaveBeenCalledOnce();
	finish();
	await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar pagamento de teste' })).toBeEnabled());
});
it('keeps the Pix available and explains a simulation failure', async () => {
	const refresh = vi.fn();
	mockFetch([
		[
			'/api/payments/attempts/a/simulate-payment',
			() => problemResponse(403, 'PAYMENT_SIMULATION_DISABLED', 'Simulação disponível apenas no ambiente de testes.'),
		],
	]);
	const { user } = renderWithProviders(
		<TransparentPaymentResult
			result={{ attemptId: 'a', status: 'pending', payment, canSimulatePayment: true }}
			onRefresh={refresh}
			onReset={() => {}}
		/>,
	);
	await user.click(screen.getByRole('button', { name: 'Confirmar pagamento de teste' }));
	expect(await screen.findByRole('alert')).toHaveTextContent('Simulação disponível apenas no ambiente de testes.');
	expect(screen.getByLabelText('Pix copia e cola')).toHaveValue(payment.copyPasteCode);
	expect(screen.getByRole('button', { name: 'Confirmar pagamento de teste' })).toBeEnabled();
	expect(refresh).not.toHaveBeenCalled();
});
it.each([
	{ respond: () => Promise.reject(new TypeError('Failed to fetch')), message: /verifique sua conexão/i },
	{ respond: () => new Response('Unavailable', { status: 503 }), message: /tente novamente/i },
])('explains unavailable simulation without losing the purchase: $message', async ({ respond, message }) => {
	mockFetch([['/api/payments/attempts/a/simulate-payment', respond]]);
	const { user } = renderWithProviders(
		<TransparentPaymentResult
			result={{ attemptId: 'a', status: 'pending', payment, canSimulatePayment: true }}
			onRefresh={() => {}}
			onReset={() => {}}
		/>,
	);
	await user.click(screen.getByRole('button', { name: 'Confirmar pagamento de teste' }));
	expect(await screen.findByRole('alert')).toHaveTextContent(message);
	expect(screen.getByLabelText('Pix copia e cola')).toHaveValue(payment.copyPasteCode);
});
it('allows an explicit new purchase after confirmation', async () => {
	const reset = vi.fn();
	const { user } = renderWithProviders(
		<TransparentPaymentResult
			result={{ attemptId: 'a', status: 'confirmed', payment }}
			onRefresh={() => {}}
			onReset={reset}
		/>,
	);
	await user.click(screen.getByRole('button', { name: 'Fazer nova compra' }));
	expect(reset).toHaveBeenCalledOnce();
});
it('shows a pending Pix with copy and verification without announcing success', async () => {
	const refresh = vi.fn();
	const { user } = renderWithProviders(
		<TransparentPaymentResult
			result={{ attemptId: 'a', status: 'pending', payment }}
			onRefresh={refresh}
			onReset={() => {}}
		/>,
	);
	expect(screen.getByRole('heading', { name: 'Pague com Pix' })).toBeInTheDocument();
	expect(screen.getByLabelText('Pix copia e cola')).toHaveValue('000201-PIX');
	expect(screen.queryByText('Compra confirmada!')).not.toBeInTheDocument();
	await user.click(screen.getByRole('button', { name: 'Verificar pagamento' }));
	expect(refresh).toHaveBeenCalled();
});
it('only presents tickets after backend confirmation and rejects external confirmation links', () => {
	renderWithProviders(
		<TransparentPaymentResult
			result={{ attemptId: 'a', status: 'confirmed', payment, confirmationUrl: 'https://evil.test/steal' }}
			onRefresh={() => {}}
			onReset={() => {}}
		/>,
	);
	expect(screen.getByRole('heading', { name: 'Compra confirmada!' })).toBeInTheDocument();
	expect(screen.getByRole('link', { name: 'Ver meus ingressos' })).toHaveAttribute('href', '/perfil?section=ingressos');
});
it('does not offer a new charge while an uncertain attempt is being reconciled', () => {
	renderWithProviders(
		<TransparentPaymentResult
			result={{ attemptId: 'a', status: 'processing', payment: null }}
			onRefresh={() => {}}
			onReset={() => {}}
		/>,
	);
	expect(screen.getByText(/Não refaça a compra/)).toBeInTheDocument();
	expect(screen.queryByRole('button', { name: 'Tentar outro pagamento' })).not.toBeInTheDocument();
});
it('copies Pix and boleto codes and provides the trusted printable boleto', async () => {
	const { user } = renderWithProviders(
		<TransparentPaymentResult
			result={{
				attemptId: 'a',
				status: 'pending',
				payment: {
					...payment,
					method: 'BOLETO',
					barcode: '12345 67890',
					boletoUrl: 'https://app.abacatepay.com/boleto/test',
				},
			}}
			onRefresh={() => {}}
			onReset={() => {}}
		/>,
	);
	const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
	await user.click(screen.getByRole('button', { name: 'Copiar linha digitável' }));
	expect(write).toHaveBeenCalledWith('12345 67890');
	expect(screen.getByRole('link', { name: 'Abrir boleto para impressão' })).toHaveAttribute(
		'href',
		'https://app.abacatepay.com/boleto/test',
	);
	expect(screen.queryByLabelText('Pix copia e cola')).not.toBeInTheDocument();
	await user.click(screen.getByRole('tab', { name: /pagar com pix/i }));
	await user.click(screen.getByRole('button', { name: 'Copiar código Pix' }));
	expect(write).toHaveBeenCalledWith('000201-PIX');
});

it('shows the real issued ticket QR after payment approval and links to the purchase', async () => {
	const { buildNominalTicket } = await import('@/test/nominal-ticket');
	const purchaseId = '00000000-0000-4000-8000-000000000123';
	mockFetch([
		[
			`/api/user/purchases/${purchaseId}`,
			() => jsonResponse({ id: purchaseId, tickets: [buildNominalTicket()], installments: [] }),
		],
	]);
	renderWithProviders(
		<TransparentPaymentResult
			result={{ attemptId: purchaseId, status: 'confirmed', payment }}
			onRefresh={() => {}}
			onReset={() => {}}
		/>,
	);
	expect(await screen.findByRole('img', { name: 'QR Code de Ana Souza' })).toBeInTheDocument();
	expect(screen.getByRole('link', { name: 'Detalhes da compra e participantes' })).toHaveAttribute(
		'href',
		`/perfil/ingressos/${purchaseId}`,
	);
});
