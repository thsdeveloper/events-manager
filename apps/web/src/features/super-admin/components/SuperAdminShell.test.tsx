import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import { SuperAdminShell } from './SuperAdminShell';

const navigationState = vi.hoisted(() => ({ pathname: '/super-admin' }));

vi.mock('next/navigation', () => ({
	usePathname: () => navigationState.pathname,
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
});
