import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import { SuperAdminShell } from './SuperAdminShell';

vi.mock('next/navigation', () => ({
	usePathname: () => '/super-admin',
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
	role: 'super_admin' as const,
	avatar: null,
};

describe('SuperAdminShell', () => {
	it('shows the shared account avatar and menu in its header', async () => {
		const { user: person } = renderWithProviders(
			<SuperAdminShell user={user as never} isOrganizer={false}>
				<p>conteúdo</p>
			</SuperAdminShell>,
		);

		await person.click(screen.getByRole('button', { name: /conta de ana/i }));
		await screen.findByRole('menu');

		expect(screen.getByText('Administração')).toBeInTheDocument();
		expect(screen.queryByText('Organização')).not.toBeInTheDocument();
		expect(screen.getByRole('menuitem', { name: /sair da conta/i })).toBeInTheDocument();
	});

	it('also offers the organizer section when the administrator organizes events', async () => {
		const { user: person } = renderWithProviders(
			<SuperAdminShell user={user as never} isOrganizer>
				<p>conteúdo</p>
			</SuperAdminShell>,
		);

		await person.click(screen.getByRole('button', { name: /conta de ana/i }));

		expect(await screen.findByText('Organização')).toBeInTheDocument();
	});
});
