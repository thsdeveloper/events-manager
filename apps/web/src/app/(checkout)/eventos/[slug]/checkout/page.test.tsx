import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { jsonResponse, mockFetch, renderWithProviders } from '@/test';
import CheckoutPage from './page';

vi.mock('next/headers', () => ({
	cookies: async () => ({ has: () => true, toString: () => 'access_token=test-session' }),
}));
vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: vi.fn() }),
	notFound: () => {
		throw new Error('Not found');
	},
	redirect: () => {
		throw new Error('Redirect');
	},
}));

async function renderCheckoutPage(profile: Record<string, unknown>) {
	mockFetch([
		[/\/api\/auth\/me$/, () => jsonResponse({ user: profile })],
		[
			/\/api\/events\/slug\/congresso$/,
			() =>
				jsonResponse({
					id: 'event-1',
					slug: 'congresso',
					title: 'Congresso',
					is_free: false,
					tickets: [{ id: 'ticket-1', title: 'Inteira', status: 'active', quantity: 10, quantity_sold: 0, price: 100 }],
				}),
		],
		['/api/payments/methods', () => jsonResponse({ methods: ['PIX'] })],
	]);

	return renderWithProviders(await CheckoutPage({ params: Promise.resolve({ slug: 'congresso' }) }));
}

describe('CheckoutPage — dados do comprador', () => {
	it('uses the authenticated profile without allowing buyer edits in checkout', async () => {
		const { user } = await renderCheckoutPage({
			id: 'user-1',
			first_name: 'Ana',
			last_name: 'Souza',
			email: 'ana@example.test',
			phone: '11987654321',
			document: '52998224725',
		});
		await user.click(screen.getAllByRole('button', { name: 'Continuar para seus dados' })[0]);
		expect(screen.getByLabelText('Nome completo *')).toHaveValue('Ana Souza');
		expect(screen.getByLabelText('E-mail *')).toHaveValue('ana@example.test');
		expect(screen.getByLabelText('Telefone')).toHaveValue('(11) 98765-4321');
		expect(screen.getByLabelText('CPF')).toHaveValue('529.982.247-25');

		for (const label of ['Nome completo *', 'E-mail *', 'Telefone', 'CPF']) {
			expect(screen.getByLabelText(label)).toHaveAttribute('readonly');
			await user.type(screen.getByLabelText(label), 'Alteração');
		}
		expect(screen.getByRole('link', { name: 'Atualizar meu perfil' })).toHaveAttribute(
			'href',
			'/perfil?section=personal',
		);
		await user.click(screen.getByRole('button', { name: 'Voltar para Ingressos' }));
		await user.click(screen.getAllByRole('button', { name: 'Continuar para seus dados' })[0]);
		expect(screen.getByLabelText('Nome completo *')).toHaveValue('Ana Souza');
		expect(screen.getByLabelText('Telefone')).toHaveValue('(11) 98765-4321');
		expect(screen.getByLabelText('CPF')).toHaveValue('529.982.247-25');
	});

	it('leaves missing optional profile data ready to complete', async () => {
		const { user } = await renderCheckoutPage({ id: 'user-1', email: 'ana@example.test', phone: null, document: null });
		await user.click(screen.getAllByRole('button', { name: 'Continuar para seus dados' })[0]);
		expect(screen.getByLabelText('E-mail *')).toHaveValue('ana@example.test');
		expect(screen.getByLabelText('Telefone')).toHaveValue('');
		expect(screen.getByLabelText('CPF')).toHaveValue('');
	});
});
