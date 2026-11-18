import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, renderWithProviders } from '@/test';
import { resetServerAuthStore } from '@/hooks/useServerAuth';
import NovoOrganizadorPage from './page';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
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
beforeEach(() => {
	vi.clearAllMocks();
	resetServerAuthStore();
});
function setup(options: { existing?: boolean; incomplete?: boolean; pending?: boolean; guest?: boolean } = {}) {
	return mockFetch([
		[
			'/api/auth/me',
			() =>
				jsonResponse({
					user: options.guest ? null : { ...baseUser, document: options.incomplete ? null : baseUser.document },
					isOrganizer: Boolean(options.existing),
					organizerStatus: options.pending ? 'pending' : options.existing ? 'active' : null,
				}),
		],
		[
			'/api/organizer/request',
			() => jsonResponse({ success: true, organizer: { id: 'new-org', status: 'active' } }, { status: 201 }),
		],
	]);
}
describe('NovoOrganizadorPage', () => {
	it('shows signup to a person with a complete profile', async () => {
		setup();
		renderWithProviders(<NovoOrganizadorPage />);
		expect(await screen.findByRole('radio', { name: /pessoa física/i })).toBeChecked();
	});
	it('sends an additional organizer account directly to its document verification', async () => {
		const fetchMock = setup({ existing: true });
		const { user } = renderWithProviders(<NovoOrganizadorPage />);
		expect(await screen.findByRole('radio', { name: /empresa ou organização/i })).toBeChecked();
		expect(router.replace).not.toHaveBeenCalled();
		await user.type(screen.getByLabelText(/^cnpj/i), '45723174000110');
		await user.type(screen.getByLabelText(/nome da organização ou marca/i), 'Nova Produtora');
		await user.click(screen.getByRole('checkbox', { name: /confirmo/i }));
		await user.click(screen.getByRole('button', { name: /criar conta de organizador/i }));
		await waitFor(() => expect(router.push).toHaveBeenCalledWith('/perfil/organizador/new-org/recebimento'));
		expect(router.refresh).toHaveBeenCalled();
		expect(fetchMock).toHaveBeenCalledWith(
			'/api/organizer/request',
			expect.objectContaining({ method: 'POST', body: expect.stringContaining('Nova Produtora') }),
		);
	});
	it('allows another account while a previous application is pending', async () => {
		setup({ pending: true });
		renderWithProviders(<NovoOrganizadorPage />);
		expect(await screen.findByRole('radio', { name: /empresa ou organização/i })).toBeChecked();
		expect(router.replace).not.toHaveBeenCalled();
	});
	it('keeps profile completion mandatory', async () => {
		setup({ incomplete: true });
		renderWithProviders(<NovoOrganizadorPage />);
		await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/perfil/organizador'));
		expect(screen.queryByRole('button', { name: /criar conta de organizador/i })).not.toBeInTheDocument();
	});
	it('sends visitors to login with a return URL', async () => {
		setup({ guest: true });
		renderWithProviders(<NovoOrganizadorPage />);
		await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login?redirect=/perfil/organizador/novo'));
	});
});
