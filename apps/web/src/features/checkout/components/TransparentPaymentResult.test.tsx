import { expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
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
	expect(screen.queryByText('Pagamento confirmado')).not.toBeInTheDocument();
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
	expect(screen.getByRole('heading', { name: 'Pagamento confirmado' })).toBeInTheDocument();
	expect(screen.getByRole('link', { name: 'Ver meus ingressos' })).toHaveAttribute('href', '/my-registrations');
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
	await user.click(screen.getByRole('button', { name: 'Copiar código Pix' }));
	expect(write).toHaveBeenCalledWith('000201-PIX');
	await user.click(screen.getByRole('button', { name: 'Copiar linha digitável' }));
	expect(write).toHaveBeenCalledWith('12345 67890');
	expect(screen.getByRole('link', { name: 'Abrir boleto para impressão' })).toHaveAttribute(
		'href',
		'https://app.abacatepay.com/boleto/test',
	);
});
