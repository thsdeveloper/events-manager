import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import { UserMenu } from './UserMenu';

vi.mock('next/link', () => ({
	default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

const user = {
	id: 'u1',
	email: 'ana@example.com',
	first_name: 'Ana',
	last_name: 'Silva',
	avatar: null,
	role: 'attendee' as const,
};

async function openMenu(props: Partial<React.ComponentProps<typeof UserMenu>> = {}) {
	const rendered = renderWithProviders(<UserMenu user={user} onLogout={vi.fn()} {...props} />);
	await rendered.user.click(screen.getByRole('button', { name: /conta de ana/i }));
	await screen.findByRole('menu');

	return rendered;
}

function hrefOf(name: RegExp) {
	return screen.getByRole('menuitem', { name }).getAttribute('href');
}

describe('UserMenu', () => {
	it('groups everything about the account under a single "Minha conta" section', async () => {
		await openMenu();

		expect(screen.getByText('Minha conta')).toBeInTheDocument();
		expect(screen.queryByText(/sua atividade/i)).not.toBeInTheDocument();
		expect(hrefOf(/visão geral/i)).toBe('/perfil?section=overview');
		expect(hrefOf(/dados pessoais/i)).toBe('/perfil?section=personal');
		expect(hrefOf(/segurança/i)).toBe('/perfil?section=security');
		expect(hrefOf(/preferências/i)).toBe('/perfil?section=preferences');
		expect(hrefOf(/meus ingressos/i)).toBe('/perfil?section=ingressos');
		expect(hrefOf(/pagamentos/i)).toBe('/perfil?section=payments');
		expect(hrefOf(/explorar eventos/i)).toBe('/eventos');
		expect(screen.queryByText(/organização/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/administração/i)).not.toBeInTheDocument();
	});

	it('adds an organization section for event organizers', async () => {
		await openMenu({ isOrganizer: true });

		expect(screen.getByText('Organização')).toBeInTheDocument();
		expect(hrefOf(/painel do organizador/i)).toBe('/admin/dashboard');
		expect(hrefOf(/^eventos$/i)).toBe('/admin/eventos');
		expect(hrefOf(/criar evento/i)).toBe('/admin/eventos/novo');
		expect(hrefOf(/participantes/i)).toBe('/admin/participantes');
		expect(hrefOf(/^financeiro$/i)).toBe('/admin/financeiro');
		expect(hrefOf(/^configurações$/i)).toBe('/admin/configuracoes');
		expect(screen.queryByText(/administração/i)).not.toBeInTheDocument();
	});

	it('adds an administration section for the platform administrator', async () => {
		await openMenu({ isSuperAdmin: true, user: { ...user, role: 'super_admin' } });

		expect(screen.getByText('Administração')).toBeInTheDocument();
		expect(hrefOf(/painel administrativo/i)).toBe('/super-admin');
		expect(hrefOf(/organizadores/i)).toBe('/super-admin/organizadores');
		expect(hrefOf(/financeiro da plataforma/i)).toBe('/super-admin/financeiro');
		expect(hrefOf(/configurações da plataforma/i)).toBe('/super-admin/taxas');
	});

	it('shows both sections, organization first, to an administrator who also organizes events', async () => {
		await openMenu({ isOrganizer: true, isSuperAdmin: true, user: { ...user, role: 'super_admin' } });

		const labels = screen.getAllByText(/^(Minha conta|Organização|Administração)$/).map((node) => node.textContent);
		expect(labels).toEqual(['Minha conta', 'Organização', 'Administração']);
	});
});
