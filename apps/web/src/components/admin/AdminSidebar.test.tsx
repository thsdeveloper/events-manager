import { act, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, renderWithProviders } from '@/test';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AdminSidebar from './AdminSidebar';
import { PermissionContext } from '@/components/auth/PermissionsProvider';
import { permissionDefinitions, type Permission } from '@events-manager/contracts';

const router = vi.hoisted(() => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => '/admin/eventos/novo', useRouter: () => router }));
vi.mock('next/link', () => ({
	default: ({
		children,
		href,
		onClick,
		...props
	}: {
		children: ReactNode;
		href: string;
		onClick?: React.MouseEventHandler<HTMLAnchorElement>;
	}) => (
		<a
			href={href}
			{...props}
			onClick={(event) => {
				event.preventDefault();
				onClick?.(event);
			}}
		>
			{children}
		</a>
	),
}));

const organizations = [
	{ id: 'maya', name: 'Maya Eventos', status: 'active' },
	{ id: 'outra', name: 'Outra organização', status: 'active' },
];
function renderSidebar(permissions: Permission[] = permissionDefinitions.map((p) => p.key)) {
	return renderWithProviders(
		<PermissionContext.Provider
			value={{ userId: 'owner', organizationId: 'maya', isOwner: true, active: true, permissions, events: [] }}
		>
			<SidebarProvider>
				<AdminSidebar organizer={organizations[0] as never} organizations={organizations} />
				<SidebarTrigger />
			</SidebarProvider>
		</PermissionContext.Provider>,
	);
}

describe('organizer sidebar', () => {
	it('shows only authorized destinations for a check-in operator', () => {
		renderSidebar(['events.read', 'participants.read', 'checkin.execute']);
		expect(screen.getByRole('link', { name: 'Participantes' })).toBeInTheDocument();
		expect(screen.queryByRole('link', { name: 'Financeiro' })).not.toBeInTheDocument();
		expect(screen.queryByRole('link', { name: 'Equipe' })).not.toBeInTheDocument();
	});
	it('keeps destinations accessible when collapsed and explains each icon on hover', async () => {
		const { user } = renderSidebar();
		await user.click(screen.getByRole('button', { name: 'Alternar navegação' }));
		const events = screen.getByRole('link', { name: 'Eventos' });
		await user.hover(events);
		expect(await screen.findByRole('tooltip')).toHaveTextContent('Eventos');
		expect(events).toHaveAttribute('aria-current', 'page');
		await user.unhover(events);
		await user.click(screen.getByRole('button', { name: 'Alternar navegação' }));
		expect(screen.getByRole('link', { name: 'Financeiro' })).toBeInTheDocument();
		expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
	});

	it('switches to the mobile panel when the viewport becomes narrow', async () => {
		let changed = () => {};
		const media = window.matchMedia('(max-width: 767px)');
		vi.spyOn(window, 'matchMedia').mockReturnValue({
			...media,
			addEventListener: (_type: string, listener: unknown) => {
				changed = listener as () => void;
			},
		});
		const { user } = renderSidebar();
		expect(screen.getByRole('navigation', { name: 'Navegação do organizador' })).toBeInTheDocument();
		vi.stubGlobal('innerWidth', 390);
		try {
			act(() => changed());
			expect(screen.queryByRole('navigation', { name: 'Navegação do organizador' })).not.toBeInTheDocument();
			await user.click(screen.getByRole('button', { name: 'Alternar navegação' }));
			expect(await screen.findByRole('dialog', { name: 'Navegação' })).toBeInTheDocument();
		} finally {
			vi.unstubAllGlobals();
		}
	});
	it('marks the current section and keeps all organizer destinations available', () => {
		renderSidebar();
		const nav = screen.getByRole('navigation', { name: 'Navegação do organizador' });
		expect(within(nav).getByRole('link', { name: 'Eventos' })).toHaveAttribute('aria-current', 'page');
		expect(within(nav).getByRole('link', { name: 'Financeiro' })).toHaveAttribute('href', '/admin/financeiro');
		expect(within(nav).getAllByRole('link')).toHaveLength(7);
	});

	it('lets the organizer change the active organization through the API', async () => {
		const fetchMock = mockFetch([['/api/organizer/organizations/outra/activate', () => jsonResponse({})]]);
		const { user } = renderSidebar();
		await user.click(screen.getByRole('button', { name: /Maya Eventos/ }));
		await user.click(screen.getByRole('menuitem', { name: /Outra organização/ }));
		await waitFor(() => expect(router.refresh).toHaveBeenCalled());
		expect(router.replace).toHaveBeenCalledWith('/admin');
		expect(fetchMock).toHaveBeenCalledWith(
			'/api/organizer/organizations/outra/activate',
			expect.objectContaining({ method: 'POST', credentials: 'include' }),
		);
	});

	it('closes the mobile panel after selecting a destination', async () => {
		vi.stubGlobal('innerWidth', 390);
		try {
			const { user } = renderSidebar();
			await user.click(screen.getByRole('button', { name: 'Alternar navegação' }));
			const dialog = await screen.findByRole('dialog', { name: 'Navegação' });
			await user.click(within(dialog).getByRole('link', { name: 'Eventos' }));
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		} finally {
			vi.unstubAllGlobals();
		}
	});
});
