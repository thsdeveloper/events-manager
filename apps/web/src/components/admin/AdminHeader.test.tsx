import { SidebarProvider } from '@/components/ui/sidebar';
import { screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, problemResponse, renderWithProviders } from '@/test';
import AdminHeader from './AdminHeader';

const router = vi.hoisted(() => ({
	push: vi.fn(),
	replace: vi.fn(),
	refresh: vi.fn(),
	pathname: '/admin/financeiro',
	search: '',
}));
beforeEach(() => {
	vi.clearAllMocks();
	router.pathname = '/admin/financeiro';
	router.search = '';
});

vi.mock('next/navigation', () => ({
	usePathname: () => router.pathname,
	useSearchParams: () => new URLSearchParams(router.search),
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
			<AdminHeader user={{ ...user, role: 'super_admin', can_access_platform: true } as never} organizer={organizer} />,
		);

		await person.click(screen.getByRole('button', { name: /conta de ana/i }));

		expect(await screen.findByText('Administração')).toBeInTheDocument();
	});
	it('offers a direct platform switch for superadmins, without opening the account menu', () => {
		renderHeader(
			<AdminHeader user={{ ...user, role: 'super_admin', can_access_platform: true } as never} organizer={organizer} />,
		);
		expect(screen.getByRole('link', { name: 'Painel superadmin' })).toHaveAttribute('href', '/super-admin');
	});
	it('does not expose the platform switch to an ordinary organizer', () => {
		renderHeader(<AdminHeader user={user as never} organizer={organizer} />);
		expect(screen.queryByRole('link', { name: 'Painel superadmin' })).not.toBeInTheDocument();
	});
});

const eventSelection = {
	events: [
		{ id: 'event-a', title: 'Congresso' },
		{ id: 'event-b', title: 'Oficina' },
	],
	selectedEventId: null,
};
describe('seleção de evento no Header', () => {
	it('oferece todos os eventos e salva a escolha antes de atualizar as páginas', async () => {
		const save = vi.fn((_input: unknown, init?: RequestInit) => {
			expect(JSON.parse(String(init?.body))).toEqual({ eventId: 'event-a' });

			return jsonResponse({ selectedEventId: 'event-a' });
		});
		mockFetch([['/api/organizer/event-selection', save]]);
		const { user: person } = renderHeader(
			<AdminHeader user={user as never} organizer={organizer} eventSelection={eventSelection} />,
		);
		await person.click(screen.getByRole('button', { name: 'Selecionar evento: Todos os eventos' }));
		expect(screen.getByRole('menuitemradio', { name: 'Todos os eventos' })).toHaveAttribute('aria-checked', 'true');
		await person.click(screen.getByRole('menuitemradio', { name: 'Congresso' }));
		await waitFor(() => expect(router.refresh).toHaveBeenCalled());
		expect(save).toHaveBeenCalledOnce();
	});
	it('permite voltar à visão de todos e remove o filtro local antigo da URL', async () => {
		router.search = 'eventId=event-a&page=4&startDate=2026-11-01';
		const fetchMock = mockFetch([['/api/organizer/event-selection', () => jsonResponse({ selectedEventId: null })]]);
		const { user: person } = renderHeader(
			<AdminHeader
				user={user as never}
				organizer={organizer}
				eventSelection={{ ...eventSelection, selectedEventId: 'event-a' }}
			/>,
		);
		await person.click(screen.getByRole('button', { name: 'Selecionar evento: Congresso' }));
		await person.click(screen.getByRole('menuitemradio', { name: 'Todos os eventos' }));
		await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/admin/financeiro?startDate=2026-11-01'));
		expect(fetchMock).toHaveBeenCalledWith(
			'/api/organizer/event-selection',
			expect.objectContaining({ method: 'POST', body: JSON.stringify({ eventId: null }) }),
		);
	});
	it('leva os detalhes ao novo evento em vez de manter os dados do anterior', async () => {
		router.pathname = '/admin/eventos/event-a/participantes';
		mockFetch([['/api/organizer/event-selection', () => jsonResponse({ selectedEventId: 'event-b' })]]);
		const { user: person } = renderHeader(
			<AdminHeader
				user={user as never}
				organizer={organizer}
				eventSelection={{ ...eventSelection, selectedEventId: 'event-a' }}
			/>,
		);
		await person.click(screen.getByRole('button', { name: 'Selecionar evento: Congresso' }));
		await person.click(screen.getByRole('menuitemradio', { name: 'Oficina' }));
		await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/admin/eventos/event-b/participantes'));
	});
	it('mantém a seleção anterior e mostra um erro se não puder salvar', async () => {
		mockFetch([
			['/api/organizer/event-selection', () => problemResponse(404, 'EVENT_NOT_FOUND', 'Evento não encontrado.')],
		]);
		const { user: person } = renderHeader(
			<AdminHeader user={user as never} organizer={organizer} eventSelection={eventSelection} />,
		);
		await person.click(screen.getByRole('button', { name: 'Selecionar evento: Todos os eventos' }));
		await person.click(screen.getByRole('menuitemradio', { name: 'Congresso' }));
		expect(await screen.findByRole('alert')).toHaveTextContent('Evento não encontrado.');
		expect(router.refresh).not.toHaveBeenCalled();
		expect(screen.getByRole('button', { name: 'Selecionar evento: Todos os eventos' })).toBeEnabled();
	});
	it('informa quando a organização ainda não possui eventos', async () => {
		const { user: person } = renderHeader(
			<AdminHeader user={user as never} organizer={organizer} eventSelection={{ events: [], selectedEventId: null }} />,
		);
		await person.click(screen.getByRole('button', { name: 'Selecionar evento: Todos os eventos' }));
		expect(screen.getByText('Nenhum evento cadastrado')).toBeInTheDocument();
	});
});
