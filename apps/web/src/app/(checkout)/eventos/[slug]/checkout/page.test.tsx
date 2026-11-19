import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
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

async function renderCheckoutPage(profile: Record<string, unknown>, canAutoConfirmPhone = false) {
	mockFetch([
		[/\/api\/auth\/me$/, () => jsonResponse({ user: profile, canAutoConfirmPhone })],
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
	it('uses the authenticated buyer profile and offers inline editing while keeping the account email protected', async () => {
		const { user } = await renderCheckoutPage({
			id: 'user-1',
			first_name: 'Ana',
			last_name: 'Souza',
			email: 'ana@example.test',
			phone: '11987654321',
			document: '52998224725',
			birth_date: '1990-05-20',
			phone_verified_at: '2026-11-19T10:00:00Z',
		});
		await user.click(screen.getAllByRole('button', { name: 'Continuar para seus dados' })[0]);
		const details = screen.getByRole('region', { name: 'Dados do comprador' });
		expect(within(details).getByText('Ana Souza')).toBeInTheDocument();
		expect(within(details).getByText('(11) 98765-4321')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Editar dados' }));
		expect(screen.getByLabelText('Nome *')).toHaveValue('Ana');
		expect(screen.getByLabelText('Sobrenome *')).toHaveValue('Souza');
		expect(screen.getByLabelText('E-mail *')).toHaveAttribute('readonly');
		expect(screen.queryByRole('link', { name: 'Atualizar meu perfil' })).not.toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Voltar para Ingressos' }));
		await user.click(screen.getAllByRole('button', { name: 'Continuar para seus dados' })[0]);
		expect(screen.getByRole('region', { name: 'Dados do comprador' })).toHaveTextContent('Ana Souza');
	});
	it('requires missing identity fields and SMS confirmation before continuing to payment', async () => {
		const { user } = await renderCheckoutPage({ id: 'user-1', email: 'ana@example.test', phone: null, document: null });
		await user.click(screen.getByRole('button', { name: 'Completar meus dados' }));
		expect(screen.getByLabelText('E-mail *')).toHaveValue('ana@example.test');
		expect(screen.getByLabelText('Telefone *')).toHaveValue('');
		expect(screen.getByLabelText('CPF *')).toHaveValue('');
		expect(screen.getByRole('button', { name: 'Continuar para pagamento' })).toBeDisabled();
		expect(screen.getByRole('button', { name: 'Confirmar por SMS' })).toBeInTheDocument();
	});
	it('passes the development shortcut capability from the API to the checkout', async () => {
		const { user } = await renderCheckoutPage({ id: 'user-1', email: 'ana@example.test', phone: null }, true);
		await user.click(screen.getByRole('button', { name: 'Completar meus dados' }));
		expect(screen.getByRole('button', { name: 'Confirmar telefone (desenvolvimento)' })).toBeInTheDocument();
	});
});
