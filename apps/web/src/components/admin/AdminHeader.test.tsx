import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import AdminHeader from './AdminHeader';

vi.mock('next/navigation', () => ({
	usePathname: () => '/admin/financeiro',
	useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
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
	role: 'organizer' as const,
	avatar: { id: 'm1', bucket: 'media', path: 'u1/avatars/ana.png', filename: 'ana.png' },
};
const organizer = { id: 'o1', name: 'Maya Eventos', status: 'active' } as never;

describe('AdminHeader', () => {
	it('shows the same account avatar and menu as the rest of the site', async () => {
		const { user: person } = renderWithProviders(<AdminHeader user={user as never} organizer={organizer} />);

		const trigger = screen.getByRole('button', { name: /conta de ana/i });
		expect(trigger).toBeInTheDocument();

		await person.click(trigger);
		await screen.findByRole('menu');
		expect(screen.getByText('Organização')).toBeInTheDocument();
		expect(screen.getByRole('menuitem', { name: /dados pessoais/i })).toHaveAttribute(
			'href',
			'/perfil?section=personal',
		);
		expect(screen.getByRole('menuitem', { name: /sair da conta/i })).toBeInTheDocument();
	});

	it('does not offer a theme switch: the organizer area follows the site theme', () => {
		renderWithProviders(<AdminHeader user={user as never} organizer={organizer} />);

		expect(screen.queryByRole('button', { name: /tema/i })).not.toBeInTheDocument();
	});

	it('opens the administration section for a super admin managing events', async () => {
		const { user: person } = renderWithProviders(
			<AdminHeader user={{ ...user, role: 'super_admin' } as never} organizer={organizer} />,
		);

		await person.click(screen.getByRole('button', { name: /conta de ana/i }));

		expect(await screen.findByText('Administração')).toBeInTheDocument();
	});
});
