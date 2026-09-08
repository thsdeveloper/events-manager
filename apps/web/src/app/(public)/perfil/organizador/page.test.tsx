import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { mockFetch, problemResponse, renderWithProviders } from '@/test';
import PerfilOrganizadorPage from './page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock('next/link', () => ({
	default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

const session = vi.fn();
vi.mock('@/hooks/useServerAuth', () => ({ useServerAuth: () => session() }));

const user = {
	id: 'u1',
	email: 'ana@example.com',
	first_name: 'Ana',
	last_name: 'Silva',
	avatar: 'media-1',
	birth_date: '1990-05-20',
	document: '52998224725',
	phone: '11999990000',
	phone_verified_at: '2026-09-04T19:00:00.000Z',
	location: 'Uberlândia - MG',
	description: 'Gosto de festivais.',
};

function auth(overrides: Record<string, unknown> = {}) {
	return {
		user,
		isLoading: false,
		isAuthenticated: true,
		isOrganizer: false,
		isSuperAdmin: false,
		organizerStatus: null,
		hasPendingOrganizerRequest: false,
		refresh: vi.fn(),
		logout: vi.fn(),
		updateUser: vi.fn(),
		...overrides,
	};
}

/**
 * Header, footer and page content share the Container width. Inside it,
 * nothing may re-centre itself in a narrower column, or the left edge of the
 * content stops lining up with the logo.
 */
function expectAlignedWithHeader(container: HTMLElement) {
	const wrapper = container.querySelector('.max-w-7xl');
	expect(wrapper).not.toBeNull();
	expect(wrapper?.className).toMatch(/\bpx-4\b/);
	for (const centred of Array.from(container.querySelectorAll('.mx-auto'))) {
		expect(centred.className).toMatch(/\bmax-w-7xl\b/);
	}
}

describe('PerfilOrganizadorPage', () => {
	it('welcomes an active organizer with the next steps, aligned with the header', () => {
		mockFetch([]);
		session.mockReturnValue(auth({ isOrganizer: true, organizerStatus: 'active' }));

		const { container } = renderWithProviders(<PerfilOrganizadorPage />);

		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/tudo pronto, ana/i);
		expect(screen.getByRole('link', { name: /criar evento/i })).toHaveAttribute('href', '/admin/eventos/novo');
		// A caixa com confete é decorativa: fora da árvore de acessibilidade.
		const illustration = container.querySelector('img[src*="celebration"]');
		expect(illustration).not.toBeNull();
		expect(illustration).toHaveAttribute('alt', '');
		expect(illustration).toHaveAttribute('aria-hidden', 'true');
		expectAlignedWithHeader(container);
	});

	it('shows the review status to a pending organizer, aligned with the header', () => {
		mockFetch([]);
		session.mockReturnValue(auth({ organizerStatus: 'pending', hasPendingOrganizerRequest: true }));

		const { container } = renderWithProviders(<PerfilOrganizadorPage />);

		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/em análise/i);
		expect(screen.queryByRole('link', { name: /editar informações/i })).not.toBeInTheDocument();
		// A ilustração é decorativa: fica fora da árvore de acessibilidade.
		const illustration = container.querySelector('img[src*="reviewing"]');
		expect(illustration).not.toBeNull();
		expect(illustration).toHaveAttribute('alt', '');
		expect(illustration).toHaveAttribute('aria-hidden', 'true');
		expectAlignedWithHeader(container);
	});

	it('shows the landing to everyone else', () => {
		mockFetch([['/api/admin/event-configurations', () => problemResponse(401, 'UNAUTHORIZED')]]);
		session.mockReturnValue(auth());

		const { container } = renderWithProviders(<PerfilOrganizadorPage />);

		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/venda ingressos/i);
		expectAlignedWithHeader(container);
	});
});
