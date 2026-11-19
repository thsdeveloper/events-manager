import { platformPermissionDefinitions } from '@events-manager/contracts';
import { PlatformPermissionContext } from '@/features/platform-access/PlatformPermissions';
import { screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, renderWithProviders } from '@/test';
import { SuperAdminShell as Shell } from './SuperAdminShell';

function SuperAdminShell(props: React.ComponentProps<typeof Shell>) {
	return (
		<PlatformPermissionContext.Provider
			value={{ userId: 'u1', active: true, isRoot: true, permissions: platformPermissionDefinitions.map((p) => p.key) }}
		>
			<Shell {...props} />
		</PlatformPermissionContext.Provider>
	);
}
const navigationState = vi.hoisted(() => ({ pathname: '/super-admin' }));
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));

vi.mock('next/navigation', () => ({
	usePathname: () => navigationState.pathname,
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
	role: 'super_admin' as const,
	avatar: null,
};

describe('SuperAdminShell', () => {
	it('identifies an administrator by email when their name has not been filled in', () => {
		renderWithProviders(
			<SuperAdminShell user={{ ...user, first_name: null, last_name: null } as never} isOrganizer={false}>
				<p>conteúdo</p>
			</SuperAdminShell>,
		);
		expect(screen.getByText(user.email)).toBeInTheDocument();
	});
	it('ends the session from the sidebar and returns to login', async () => {
		mockFetch([['/api/auth/logout', () => jsonResponse({})]]);
		const { user: person } = renderWithProviders(
			<SuperAdminShell user={user as never} isOrganizer={false}>
				<p>conteúdo</p>
			</SuperAdminShell>,
		);
		await person.click(screen.getByRole('button', { name: 'Sair' }));
		await waitFor(() => expect(router.push).toHaveBeenCalledWith('/login'));
		expect(router.refresh).toHaveBeenCalled();
	});

	it('closes mobile navigation after choosing a content section', async () => {
		vi.stubGlobal('innerWidth', 390);
		try {
			const { user: person } = renderWithProviders(
				<SuperAdminShell user={user as never} isOrganizer>
					<p>conteúdo</p>
				</SuperAdminShell>,
			);
			await person.click(screen.getByRole('button', { name: 'Alternar navegação' }));
			const dialog = await screen.findByRole('dialog', { name: 'Navegação' });
			await person.click(within(dialog).getByRole('link', { name: 'Páginas' }));
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		} finally {
			vi.unstubAllGlobals();
		}
	});
	it('opens mobile navigation in a dismissible accessible panel', async () => {
		vi.stubGlobal('innerWidth', 390);
		try {
			const { user: person } = renderWithProviders(
				<SuperAdminShell user={user as never} isOrganizer={false}>
					<p>conteúdo</p>
				</SuperAdminShell>,
			);
			await person.click(screen.getByRole('button', { name: 'Alternar navegação' }));
			expect(await screen.findByRole('dialog', { name: 'Navegação' })).toBeInTheDocument();
			await person.keyboard('{Escape}');
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it('offers the content management section next to the platform links', () => {
		renderWithProviders(
			<SuperAdminShell user={user as never} isOrganizer={false}>
				<p>conteúdo</p>
			</SuperAdminShell>,
		);

		const sidebar = screen.getByRole('navigation', { name: /navegação do super admin/i });
		const links = Array.from(sidebar.querySelectorAll('a')).map((anchor) => [
			anchor.textContent?.trim(),
			anchor.getAttribute('href'),
		]);

		expect(links).toEqual(
			expect.arrayContaining([
				['Categorias', '/super-admin/categorias'],
				['Visão do conteúdo', '/super-admin/conteudo'],
				['Páginas', '/super-admin/conteudo/paginas'],
				['Blog', '/super-admin/conteudo/blog'],
				['Menus', '/super-admin/conteudo/menus'],
				['Formulários', '/super-admin/conteudo/formularios'],
				['Redirecionamentos', '/super-admin/conteudo/redirecionamentos'],
				['Mídia', '/super-admin/conteudo/midia'],
				['Site e SEO', '/super-admin/conteudo/site'],
			]),
		);
	});

	it('marks only the pages link as current when editing pages, not the content overview', () => {
		navigationState.pathname = '/super-admin/conteudo/paginas/abc';
		try {
			renderWithProviders(
				<SuperAdminShell user={user as never} isOrganizer={false}>
					<p>conteúdo</p>
				</SuperAdminShell>,
			);

			const sidebar = screen.getByRole('navigation', { name: /navegação do super admin/i });
			const current = Array.from(sidebar.querySelectorAll('a[aria-current="page"]')).map((anchor) =>
				anchor.textContent?.trim(),
			);

			expect(current).toEqual(['Páginas']);
		} finally {
			navigationState.pathname = '/super-admin';
		}
	});

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
	it('offers the organizer workspace directly in the main header', () => {
		renderWithProviders(
			<SuperAdminShell user={user as never} isOrganizer>
				<p>conteúdo</p>
			</SuperAdminShell>,
		);
		expect(within(screen.getByRole('banner')).getByRole('link', { name: 'Painel do organizador' })).toHaveAttribute(
			'href',
			'/admin/dashboard',
		);
	});
	it('guides a superadmin without an organization to organizer setup', () => {
		renderWithProviders(
			<SuperAdminShell user={user as never} isOrganizer={false}>
				<p>conteúdo</p>
			</SuperAdminShell>,
		);
		expect(within(screen.getByRole('banner')).getByRole('link', { name: 'Organizar eventos' })).toHaveAttribute(
			'href',
			'/perfil/organizador',
		);
	});
});

it('only shows authorized platform modules for a delegated team member', () => {
	renderWithProviders(
		<PlatformPermissionContext.Provider
			value={{
				userId: 'u1',
				active: true,
				isRoot: false,
				permissions: ['platform_organizers.read', 'platform_users.read'],
			}}
		>
			<Shell user={user as never} isOrganizer={false}>
				Content
			</Shell>
		</PlatformPermissionContext.Provider>,
	);
	const nav = screen.getByRole('navigation', { name: /navegação do super admin/i });
	expect(within(nav).getByRole('link', { name: 'Equipe' })).toHaveAttribute('href', '/super-admin/equipe');
	expect(within(nav).getByRole('link', { name: 'Organizadores' })).toBeInTheDocument();
	expect(within(nav).queryByRole('link', { name: 'Financeiro' })).not.toBeInTheDocument();
	expect(within(nav).queryByRole('link', { name: 'Taxas e gateway' })).not.toBeInTheDocument();
});
