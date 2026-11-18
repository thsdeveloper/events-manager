import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { organizerAdminQuerySchema, type OrganizerAdminList } from '@events-manager/contracts';
import { renderWithProviders } from '@/test';
import { OrganizerTable } from './OrganizerTable';
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
beforeEach(() => vi.clearAllMocks());
const result = {
	data: [
		{
			id: 'org-a',
			name: 'Produtora A',
			email: 'a@example.com',
			status: 'pending',
			payout_status: 'pending_review',
			document: '45723174000110',
			date_created: '2026-11-18T12:00:00Z',
			metrics: { events: 2, ticketsSold: 8, grossRevenue: 100 },
		},
	],
	pagination: { page: 1, limit: 20, total: 42, pageCount: 3 },
} as OrganizerAdminList;
describe('OrganizerTable', () => {
	it('links each organizer to its support page and paginates the server results', async () => {
		const { user } = renderWithProviders(
			<OrganizerTable result={result} query={organizerAdminQuerySchema.parse({})} />,
		);
		expect(screen.getByRole('link', { name: 'Produtora A' })).toHaveAttribute(
			'href',
			'/super-admin/organizadores/org-a',
		);
		expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Próxima' }));
		expect(router.push).toHaveBeenCalledWith(expect.stringContaining('page=2'));
	});
	it('sorts on the server and resets pagination while keeping the active filter', async () => {
		const { user } = renderWithProviders(
			<OrganizerTable
				result={{ ...result, pagination: { ...result.pagination, page: 2 } }}
				query={organizerAdminQuerySchema.parse({ page: 2, status: 'pending' })}
			/>,
		);
		await user.click(screen.getByRole('button', { name: 'Ordenar por Organizador' }));
		const url = router.push.mock.calls[0][0];
		expect(url).toContain('sort=name');
		expect(url).toContain('page=1');
		expect(url).toContain('status=pending');
	});
	it('searches names, e-mails and fiscal documents before pagination', async () => {
		const { user } = renderWithProviders(
			<OrganizerTable result={result} query={organizerAdminQuerySchema.parse({})} />,
		);
		await user.type(screen.getByRole('textbox', { name: 'Buscar organizadores' }), '45723174000110');
		await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
		await waitFor(() => expect(router.push).toHaveBeenCalledWith(expect.stringContaining('search=45723174000110')));
	});
});
