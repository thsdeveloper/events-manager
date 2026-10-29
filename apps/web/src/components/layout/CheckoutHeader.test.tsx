/**
 * Cabeçalho do checkout. Diferente do site, ele não oferece a navegação
 * completa: cada link a mais é uma saída do funil. Fica o logo, o caminho de
 * volta ao evento e a conta da pessoa.
 */
import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import { CheckoutHeader } from './CheckoutHeader';

vi.mock('next/link', () => ({
	default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));
vi.mock('next/image', () => ({
	default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}));
vi.mock('@/components/layout/UserMenu', () => ({
	UserMenu: ({ user }: { user: { first_name: string | null } }) => <div>Menu de {user.first_name}</div>,
}));

const useServerAuth = vi.fn();
vi.mock('@/hooks/useServerAuth', () => ({ useServerAuth: () => useServerAuth() }));

const signedIn = {
	user: { id: 'u1', email: 'ana@example.com', first_name: 'Ana', last_name: 'Silva' },
	isLoading: false,
	isAuthenticated: true,
	isOrganizer: false,
	isSuperAdmin: false,
	organizerStatus: null,
	hasPendingOrganizerRequest: false,
	logout: vi.fn(),
	refresh: vi.fn(),
};

function renderHeader() {
	return renderWithProviders(<CheckoutHeader backHref="/eventos/congresso" globals={{ id: 'g', title: 'Flouvi' }} />);
}

describe('CheckoutHeader', () => {
	it('keeps only the logo, the way back to the event and the account', () => {
		useServerAuth.mockReturnValue(signedIn);

		renderHeader();

		expect(screen.getByRole('link', { name: /flouvi/i })).toHaveAttribute('href', '/');
		expect(screen.getByRole('link', { name: 'Voltar ao evento' })).toHaveAttribute('href', '/eventos/congresso');
		expect(screen.getByText('Menu de Ana')).toBeInTheDocument();
		expect(screen.queryByRole('link', { name: /eventos|blog|sobre|criar evento/i })).not.toBeInTheDocument();
	});

	it('shows nothing on the account side while the session is still being checked', () => {
		useServerAuth.mockReturnValue({ ...signedIn, user: null, isAuthenticated: false, isLoading: true });

		renderHeader();

		expect(screen.queryByText(/Menu de/)).not.toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Voltar ao evento' })).toBeInTheDocument();
	});
});
