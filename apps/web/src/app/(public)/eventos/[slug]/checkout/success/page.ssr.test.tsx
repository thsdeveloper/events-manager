import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { jsonResponse, mockFetch } from '@/test/fetch';
import CheckoutSuccessPage from './page';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ has: () => true, toString: () => 'access_token=test' }) }));
vi.mock('next/navigation', () => ({
	redirect: (url: string) => {
		throw new Error(`redirect:${url}`);
	},
}));

it('uses the branded confirmation and ticket access for a server-confirmed purchase', async () => {
	mockFetch([
		['/api/auth/me', () => jsonResponse({ user: { id: 'buyer' } })],
		[
			'/api/payments/checkout/status?checkout_id=attempt',
			() => jsonResponse({ status: 'confirmed', registrations: [] }),
		],
	]);
	const html = renderToStaticMarkup(
		<QueryClientProvider client={new QueryClient()}>
			{await CheckoutSuccessPage({
				params: Promise.resolve({ slug: 'congresso' }),
				searchParams: Promise.resolve({ checkout_id: 'attempt' }),
			})}
		</QueryClientProvider>,
	);
	expect(html).toMatch(/<h2[^>]*>Compra confirmada!/);
	expect(html).toContain('Ver meus ingressos');
	expect(html).toContain('href="/perfil?section=ingressos"');
});
it('never celebrates a purchase that the server still considers pending', async () => {
	mockFetch([
		['/api/auth/me', () => jsonResponse({ user: { id: 'buyer' } })],
		['/api/payments/checkout/status?checkout_id=attempt', () => jsonResponse({ status: 'pending', registrations: [] })],
	]);
	const html = renderToStaticMarkup(
		<QueryClientProvider client={new QueryClient()}>
			{await CheckoutSuccessPage({
				params: Promise.resolve({ slug: 'congresso' }),
				searchParams: Promise.resolve({ checkout_id: 'attempt' }),
			})}
		</QueryClientProvider>,
	);
	expect(html).toContain('Pagamento em processamento');
	expect(html).not.toContain('Compra confirmada!');
	expect(html).toContain('Atualizar status');
	expect(html).toContain('/eventos/congresso/checkout/success?checkout_id=attempt');
});
