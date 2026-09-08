import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import NovoOrganizadorPage from './page';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: replace, replace, refresh: vi.fn() }) }));
vi.mock('@/features/organizer-signup', () => ({
	OrganizerSignupForm: () => <div>formulário de solicitação</div>,
}));
vi.mock('next/link', () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

const session = vi.fn();
vi.mock('@/hooks/useServerAuth', () => ({ useServerAuth: () => session() }));

const baseUser = {
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

function auth(user: Record<string, unknown>) {
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
	};
}

describe('NovoOrganizadorPage', () => {
	it('shows the request form to a person with a complete profile', () => {
		session.mockReturnValue(auth(baseUser));

		renderWithProviders(<NovoOrganizadorPage />);

		expect(screen.getByText('formulário de solicitação')).toBeInTheDocument();
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/conta de organizador/i);
	});

	it('keeps the page inside the same container as the header', () => {
		session.mockReturnValue(auth(baseUser));

		const { container } = renderWithProviders(<NovoOrganizadorPage />);

		const wrapper = container.querySelector('.max-w-7xl');
		expect(wrapper).not.toBeNull();
		expect(wrapper?.className).toMatch(/\bpx-4\b/);
	});

	it('sends someone who already has an organizer account back to the organizer page', () => {
		session.mockReturnValue({ ...auth(baseUser), isOrganizer: true, organizerStatus: 'active' });

		renderWithProviders(<NovoOrganizadorPage />);

		expect(screen.queryByText('formulário de solicitação')).not.toBeInTheDocument();
		expect(replace).toHaveBeenCalledWith('/perfil/organizador');
	});

	it('sends an incomplete profile back to the organizer page instead of the form', () => {
		session.mockReturnValue(auth({ ...baseUser, document: null }));

		renderWithProviders(<NovoOrganizadorPage />);

		expect(screen.queryByText('formulário de solicitação')).not.toBeInTheDocument();
		expect(replace).toHaveBeenCalledWith('/perfil/organizador');
	});
});
