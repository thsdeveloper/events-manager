import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OrganizerSupportDetail } from '@events-manager/contracts';
import { jsonResponse, mockFetch, renderWithProviders } from '@/test';
import { Toaster } from '@/components/ui/toaster';
import { OrganizerSupportPage } from './OrganizerSupportPage';
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
const detail: OrganizerSupportDetail = {
	organizer: {
		id: 'org-a',
		user_id: 'owner-a',
		name: 'Produtora A',
		email: 'contato@example.com',
		phone: '11999999999',
		document: '45723174000110',
		website: null,
		description: 'Festivais',
		status: 'pending',
		payout_status: 'pending_review',
		payout_pix_key: 'pix@example.com',
		payout_pix_key_type: 'EMAIL',
		date_created: '2026-11-18T12:00:00Z',
		date_updated: '2026-11-18T12:00:00Z',
	},
	owner: {
		id: 'owner-a',
		first_name: 'Ana',
		last_name: 'Silva',
		email: 'ana@example.com',
		phone: '11999999999',
		document: '52998224725',
		status: 'active',
		phone_verified_at: null,
	},
	metrics: {
		events: 2,
		publishedEvents: 1,
		registrations: 8,
		ticketsSold: 7,
		grossRevenue: 100,
		failedPayments: 1,
		availableBalance: 75,
		reservedPayouts: 10,
		completedPayouts: 15,
	},
};
function renderPage() {
	return renderWithProviders(
		<>
			<OrganizerSupportPage initialDetail={detail} />
			<Toaster />
		</>,
	);
}
describe('OrganizerSupportPage', () => {
	it('shows contact, responsible profile, fiscal identity and financial diagnostics', () => {
		mockFetch([]);
		renderPage();
		expect(screen.getByRole('heading', { level: 1, name: 'Produtora A' })).toBeInTheDocument();
		expect(screen.getByText('Ana Silva')).toBeInTheDocument();
		expect(screen.getByText('45723174000110')).toBeInTheDocument();
		expect(screen.getByText('Saldo disponível')).toBeInTheDocument();
		expect(screen.queryByLabelText('Chave PIX')).not.toBeInTheDocument();
		expect(screen.getByRole('tab', { name: 'Recebimento e documentos' })).toBeInTheDocument();
	});
	it('requires a support reason and saves account status with the standard success toast', async () => {
		let current = detail;
		const fetchMock = mockFetch([
			[
				'/api/super-admin/organizers/org-a',
				(_url, init) => {
					if (init?.method === 'PATCH') {
						current = { ...detail, organizer: { ...detail.organizer, status: 'active' } };

						return jsonResponse({ success: true, organizer: current.organizer });
					}

					return jsonResponse(current);
				},
			],
		]);
		const { user } = renderPage();
		const form = screen.getByRole('form', { name: 'Situação da conta' });
		await user.selectOptions(within(form).getByLabelText('Status da conta'), 'active');
		await user.click(within(form).getByRole('button', { name: 'Salvar status' }));
		expect(fetchMock).not.toHaveBeenCalled();
		await user.type(within(form).getByLabelText('Motivo da alteração'), 'Cadastro conferido pelo atendimento');
		await user.click(within(form).getByRole('button', { name: 'Salvar status' }));
		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				'/api/super-admin/organizers/org-a',
				expect.objectContaining({
					method: 'PATCH',
					body: JSON.stringify({ status: 'active', reason: 'Cadastro conferido pelo atendimento' }),
				}),
			),
		);
		expect(await screen.findByText('Organizador atualizado')).toBeInTheDocument();
	});
	it('loads paginated history and records an internal support note', async () => {
		const records = {
			data: [
				{
					id: 'audit-a',
					action: 'organizer.updated',
					reason: 'Conferência anterior',
					date_created: '2026-11-18T12:00:00Z',
					actor: { name: 'Suporte' },
					before_data: { status: 'pending' },
					after_data: { status: 'active' },
				},
			],
			pagination: { page: 1, limit: 10, total: 12, pageCount: 2 },
		};
		const fetchMock = mockFetch([
			[/\/records\?/, () => jsonResponse(records)],
			['/api/super-admin/organizers/org-a/notes', () => jsonResponse({ success: true }, { status: 201 })],
		]);
		const { user } = renderPage();
		await user.click(screen.getByRole('tab', { name: 'Histórico e atendimento' }));
		expect(await screen.findByText('Conferência anterior')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Próxima' }));
		await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('page=2'), expect.anything()));
		await user.type(screen.getByLabelText('Anotação interna'), 'Responsável orientado sobre o cadastro.');
		await user.click(screen.getByRole('button', { name: 'Registrar atendimento' }));
		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				'/api/super-admin/organizers/org-a/notes',
				expect.objectContaining({ method: 'POST' }),
			),
		);
	});
});
