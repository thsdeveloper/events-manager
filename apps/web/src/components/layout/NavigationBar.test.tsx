import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import NavigationBar from './NavigationBar';

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
vi.mock('@/components/ui/SearchModal', () => ({ default: () => <button type="button">Buscar</button> }));
vi.mock('@/components/layout/UserMenu', () => ({
	UserMenu: ({
		user,
		isOrganizer,
		isSuperAdmin,
	}: {
		user: { first_name: string | null };
		isOrganizer?: boolean;
		isSuperAdmin?: boolean;
	}) => (
		<div>
			Menu de {user.first_name}
			{isOrganizer ? ' (organizador)' : ''}
			{isSuperAdmin ? ' (administrador)' : ''}
		</div>
	),
}));
vi.mock('@/components/animate-ui/icons/menu', () => ({ Menu: () => <svg /> }));
vi.mock('@/components/animate-ui/icons/x', () => ({ X: () => <svg /> }));
vi.mock('@/components/animate-ui/icons/chevron-down', () => ({ ChevronDown: () => <svg /> }));
vi.mock('@/components/animate-ui/icons/icon', () => ({
	AnimateIcon: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const useServerAuth = vi.fn();
vi.mock('@/hooks/useServerAuth', () => ({ useServerAuth: () => useServerAuth() }));

const baseAuth = {
	user: null,
	isLoading: false,
	isAuthenticated: false,
	isOrganizer: false,
	isSuperAdmin: false,
	organizerStatus: null,
	hasPendingOrganizerRequest: false,
	logout: vi.fn(),
	refresh: vi.fn(),
};

function renderHeader() {
	return renderWithProviders(<NavigationBar navigation={{ items: [] }} globals={null} />);
}

describe('NavigationBar', () => {
	it('offers a sign-in link to visitors', () => {
		useServerAuth.mockReturnValue(baseAuth);

		renderHeader();

		const links = screen.getAllByRole('link', { name: /entrar/i });
		expect(links.length).toBeGreaterThan(0);
		for (const link of links) expect(link).toHaveAttribute('href', '/login');
	});

	it('does not flash the sign-in link while the session is still being checked', () => {
		useServerAuth.mockReturnValue({ ...baseAuth, isLoading: true });

		renderHeader();

		expect(screen.queryByRole('link', { name: /entrar/i })).not.toBeInTheDocument();
	});

	it('hands the resolved roles to the user menu so it can show the right sections', () => {
		useServerAuth.mockReturnValue({
			...baseAuth,
			isAuthenticated: true,
			isOrganizer: true,
			isSuperAdmin: true,
			user: { id: 'u1', email: 'ana@example.com', first_name: 'Ana', last_name: 'Silva' },
		});

		renderHeader();

		expect(screen.getAllByText('Menu de Ana (organizador) (administrador)').length).toBeGreaterThan(0);
	});

	it('no longer repeats "Meus ingressos" in the header: it lives in the account menu', () => {
		useServerAuth.mockReturnValue({
			...baseAuth,
			isAuthenticated: true,
			user: { id: 'u1', email: 'ana@example.com', first_name: 'Ana', last_name: 'Silva' },
		});

		renderHeader();

		expect(screen.queryByRole('link', { name: /meus ingressos/i })).not.toBeInTheDocument();
	});

	it('replaces the sign-in link with the user menu once authenticated', () => {
		useServerAuth.mockReturnValue({
			...baseAuth,
			isAuthenticated: true,
			user: { id: 'u1', email: 'ana@example.com', first_name: 'Ana', last_name: 'Silva' },
		});

		renderHeader();

		expect(screen.queryByRole('link', { name: /entrar/i })).not.toBeInTheDocument();
		expect(screen.getAllByText('Menu de Ana').length).toBeGreaterThan(0);
	});
});
