import { TestPermissions, ownerAccess } from '@/test/permissions';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, renderWithProviders } from '@/test';
import { AdminEventScope } from '@/features/event-scope/components/AdminEventScope';
import FinanceiroDashboard from './FinanceiroDashboard';

const metrics = {
	gross: 100,
	serviceFees: 10,
	net: 90,
	ticketsSold: 1,
	totalTransactions: 1,
	averageTicket: 100,
	pendingCount: 0,
	refundedCount: 0,
	allRegistrations: 1,
	allGross: 100,
};
const transactions = { data: [], pagination: { page: 1, limit: 20, total: 0, pageCount: 0 } };
const payouts = { balance: { available: 9000, pending: 0, currency: 'brl' }, payouts: [] };
const events = [{ id: 'event-a', title: 'Congresso' }];

function view(selectedEventId: string | null, access = ownerAccess) {
	return (
		<TestPermissions access={access}>
			<AdminEventScope scopeKey="user:org" selection={{ events, selectedEventId }}>
				<FinanceiroDashboard
					organizer={{ payout_status: 'enabled' } as never}
					initialEvents={events}
					initialOverview={metrics}
					initialTransactions={transactions}
					initialPayouts={selectedEventId ? null : payouts}
				/>
			</AdminEventScope>
		</TestPermissions>
	);
}

describe('Financeiro por evento', () => {
	it('does not expose or fetch organization payouts to event-only finance members', () => {
		const fetchMock = mockFetch([['/api/organizer/finance', () => jsonResponse(transactions)]]);
		renderWithProviders(
			view(null, {
				...ownerAccess,
				isOwner: false,
				permissions: [],
				events: [{ eventId: 'event-a', permissions: ['finance.read'] }],
			}),
		);
		expect(screen.queryByRole('button', { name: 'Atualizar repasses' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Exportar CSV' })).not.toBeInTheDocument();
		expect(screen.queryByText('Repasses', { exact: true })).not.toBeInTheDocument();
		expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/payouts'))).toBe(false);
	});
	it('mostra as vendas e oculta saldo e saques sem consultar repasses ao selecionar um evento', async () => {
		const fetchMock = mockFetch([
			['/api/organizer/finance/transactions', () => jsonResponse(transactions)],
			['/api/organizer/finance/overview', () => jsonResponse({ metrics })],
			['/api/organizer/finance/payouts', () => jsonResponse(payouts)],
		]);
		const { user } = renderWithProviders(view('event-a'));
		expect(screen.getByText('Transações')).toBeInTheDocument();
		expect(screen.queryByText('Repasses', { exact: true })).not.toBeInTheDocument();
		expect(screen.queryByText('Conta de repasse habilitada')).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Atualizar repasses' })).not.toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: /Filtros/ }));
		expect(screen.queryByRole('combobox', { name: 'Evento' })).not.toBeInTheDocument();
		expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/payouts'))).toBe(false);
	});
	it('restaura saldo e repasses ao visualizar todos os eventos', () => {
		mockFetch([['/api/organizer/finance', () => jsonResponse(transactions)]]);
		renderWithProviders(view(null));
		expect(screen.getByText('Repasses', { exact: true })).toBeInTheDocument();
		expect(screen.getByText(/Disponível:.*9.000,00/)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Atualizar repasses' })).toBeInTheDocument();
	});
	it('exporta com GET e os filtros aplicados usando a sessão atual', async () => {
		vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() }));
		vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
		const exportCsv = vi.fn((_url: unknown, init?: RequestInit) => {
			expect(init?.method ?? 'GET').toBe('GET');

			return new Response('Evento,Total\nCongresso,100');
		});
		mockFetch([
			['/api/organizer/finance/export', exportCsv],
			['/api/organizer/finance/transactions', () => jsonResponse(transactions)],
			['/api/organizer/finance/overview', () => jsonResponse({ metrics })],
			['/api/organizer/finance/payouts', () => jsonResponse(payouts)],
		]);
		const { user } = renderWithProviders(view('event-a'));
		await user.click(screen.getByRole('button', { name: 'Exportar CSV' }));
		await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
		expect(exportCsv).toHaveBeenCalledWith(
			expect.stringContaining('date_from='),
			expect.objectContaining({ credentials: 'include' }),
		);
	});
});
