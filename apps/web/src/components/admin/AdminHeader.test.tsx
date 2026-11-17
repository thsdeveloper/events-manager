import { SidebarProvider } from '@/components/ui/sidebar';
import { screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, renderWithProviders } from '@/test';
import AdminHeader from './AdminHeader';

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));

vi.mock('next/navigation', () => ({
	usePathname: () => '/admin/financeiro',
	useRouter: () => router,
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

function renderHeader(ui: ReactNode) {
	return renderWithProviders(<SidebarProvider>{ui}</SidebarProvider>);
}

describe('AdminHeader', () => {
	it('ends the session from the account menu and returns to login', async () => {
		const logout = vi.fn(() => jsonResponse({ success: true }));
		mockFetch([['/api/auth/logout', logout]]);
		const { user: person } = renderHeader(<AdminHeader user={user as never} organizer={organizer} />);
		await person.click(screen.getByRole('button', { name: /conta de ana/i }));
		await person.click(screen.getByRole('menuitem', { name: /sair da conta/i }));
		await waitFor(() => expect(router.push).toHaveBeenCalledWith('/login'));
		expect(logout).toHaveBeenCalled();
		expect(router.refresh).toHaveBeenCalled();
	});

	it('renders the account control when automatic header measurement is unavailable', () => {
		const observer = globalThis.ResizeObserver;
		Object.defineProperty(globalThis, 'ResizeObserver', { value: undefined });
		try {
			const { unmount } = renderHeader(<AdminHeader user={user as never} organizer={organizer} />);
			expect(screen.getByRole('button', { name: /conta de ana/i })).toBeInTheDocument();
			unmount();
		} finally {
			Object.defineProperty(globalThis, 'ResizeObserver', { value: observer });
		}
	});

	it('shows the same account avatar and menu as the rest of the site', async () => {
		const { user: person } = renderHeader(<AdminHeader user={user as never} organizer={organizer} />);

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
		renderHeader(<AdminHeader user={user as never} organizer={organizer} />);

		expect(screen.queryByRole('button', { name: /tema/i })).not.toBeInTheDocument();
	});

	it('opens the administration section for a super admin managing events', async () => {
		const { user: person } = renderHeader(
			<AdminHeader user={{ ...user, role: 'super_admin' } as never} organizer={organizer} />,
		);

		await person.click(screen.getByRole('button', { name: /conta de ana/i }));

		expect(await screen.findByText('Administração')).toBeInTheDocument();
	});
	it('offers a direct platform switch for superadmins, without opening the account menu', () => {
		renderHeader(<AdminHeader user={{ ...user, role: 'super_admin' } as never} organizer={organizer} />);
		expect(screen.getByRole('link', { name: 'Painel superadmin' })).toHaveAttribute('href', '/super-admin');
	});
	it('does not expose the platform switch to an ordinary organizer', () => {
		renderHeader(<AdminHeader user={user as never} organizer={organizer} />);
		expect(screen.queryByRole('link', { name: 'Painel superadmin' })).not.toBeInTheDocument();
	});
});
