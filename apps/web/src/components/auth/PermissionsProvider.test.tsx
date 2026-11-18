import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mockFetch, jsonResponse, problemResponse, renderWithProviders } from '@/test';
import { ownerAccess } from '@/test/permissions';
import { Can, PermissionsProvider, PermissionBoundary } from './PermissionsProvider';
vi.mock('next/navigation', () => ({ usePathname: () => '/admin/financeiro' }));
describe('effective permission provider', () => {
	it('denies actions without an authenticated authorization context', () => {
		renderWithProviders(
			<Can permission="users.invite">
				<button>Convidar</button>
			</Can>,
		);
		expect(screen.queryByRole('button', { name: 'Convidar' })).not.toBeInTheDocument();
	});
	it('removes previously available actions when the API revokes access', async () => {
		mockFetch([['/api/organizer/iam/access', () => problemResponse(403, 'PERMISSION_DENIED', 'Acesso suspenso.')]]);
		renderWithProviders(
			<PermissionsProvider initialAccess={ownerAccess} organizationId="org">
				<Can permission="users.invite">
					<button>Convidar</button>
				</Can>
				<PermissionBoundary>
					<p>Dados financeiros</p>
				</PermissionBoundary>
			</PermissionsProvider>,
		);
		await waitFor(() => expect(screen.queryByRole('button', { name: 'Convidar' })).not.toBeInTheDocument());
		expect(screen.getByRole('alert')).toBeInTheDocument();
		expect(screen.queryByText('Dados financeiros')).not.toBeInTheDocument();
	});
	it('rejects permissions returned for a different organization', async () => {
		mockFetch([['/api/organizer/iam/access', () => jsonResponse({ ...ownerAccess, organizationId: 'another' })]]);
		renderWithProviders(
			<PermissionsProvider initialAccess={null} organizationId="org">
				<Can permission="users.invite">
					<button>Convidar</button>
				</Can>
				<PermissionBoundary>
					<p>Dados financeiros</p>
				</PermissionBoundary>
			</PermissionsProvider>,
		);
		await screen.findByRole('alert');
		expect(screen.queryByRole('button', { name: 'Convidar' })).not.toBeInTheDocument();
	});
});
