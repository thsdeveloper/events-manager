import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import { ProfileOverview } from './ProfileOverview';
import type { ProfileUser } from './types';

vi.mock('next/link', () => ({
	default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

const user: ProfileUser = {
	id: '00000000-0000-4000-8000-000000000001',
	email: 'ana@example.com',
	first_name: 'Ana',
	last_name: 'Silva',
	avatar: null,
	description: null,
	city_id: null,
	location: null,
	birth_date: '1990-05-20',
	document: null,
};

describe('ProfileOverview', () => {
	it('asks for the missing information while the profile is incomplete', () => {
		renderWithProviders(<ProfileOverview user={user} completion={57} onNavigate={vi.fn()} />);

		expect(screen.getByText('Complete seu perfil')).toBeInTheDocument();
		expect(screen.queryByRole('link', { name: /comprar ingressos/i })).not.toBeInTheDocument();
		expect(screen.queryByRole('link', { name: /vender ingressos/i })).not.toBeInTheDocument();
	});

	it('shows every pending item and lets each one open the section where it is filled in', async () => {
		const onNavigate = vi.fn();
		const { user: person } = renderWithProviders(
			<ProfileOverview user={{ ...user, description: 'Já tenho bio.' }} completion={13} onNavigate={onNavigate} />,
		);

		const list = screen.getByRole('list', { name: /itens do perfil/i });
		expect(list).toHaveTextContent('Nome e sobrenome');
		expect(list).toHaveTextContent('Foto de perfil');
		expect(list).toHaveTextContent('CPF');
		expect(list).toHaveTextContent('Telefone confirmado');
		expect(list).toHaveTextContent('Localização');
		expect(screen.getByRole('button', { name: 'Nome e sobrenome, concluído' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'CPF, pendente' })).toBeInTheDocument();

		await person.click(screen.getByRole('button', { name: 'CPF, pendente' }));

		expect(onNavigate).toHaveBeenCalledWith('personal');
	});

	it('offers buying or selling tickets once the profile is complete', () => {
		renderWithProviders(<ProfileOverview user={user} completion={100} onNavigate={vi.fn()} />);

		expect(screen.queryByText('Complete seu perfil')).not.toBeInTheDocument();
		expect(screen.getByRole('link', { name: /comprar ingressos/i })).toHaveAttribute('href', '/eventos');
		expect(screen.getByRole('link', { name: /vender ingressos/i })).toHaveAttribute('href', '/perfil/organizador');
	});

	it('points an organizer to their events instead of the sign-up for selling', () => {
		renderWithProviders(<ProfileOverview user={user} completion={100} isOrganizer onNavigate={vi.fn()} />);

		expect(screen.getByRole('link', { name: /gerenciar seus eventos/i })).toHaveAttribute('href', '/admin/dashboard');
		expect(screen.queryByRole('link', { name: /vender ingressos/i })).not.toBeInTheDocument();
	});
});
