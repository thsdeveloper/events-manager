import { screen, waitFor } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
import { renderWithProviders, mockFetch, problemResponse, jsonResponse } from '@/test';
import { platformRoot, renderWithPlatformPermissions } from '@/test/platform';
import { PlatformBoundary, PlatformPermissionsProvider, PlatformWrite } from './PlatformPermissions';
vi.mock('next/navigation', () => ({ usePathname: () => '/super-admin/equipe' }));
it('hides protected content after the server revokes the membership without waiting for login', async () => {
	mockFetch([
		['/api/super-admin/iam/access', () => problemResponse(403, 'PLATFORM_PERMISSION_DENIED', 'Acesso revogado.')],
	]);
	renderWithProviders(
		<PlatformPermissionsProvider initialAccess={platformRoot}>
			<PlatformBoundary>
				<p>Dados protegidos</p>
			</PlatformBoundary>
		</PlatformPermissionsProvider>,
	);
	await screen.findByRole('alert');
	expect(screen.queryByText('Dados protegidos')).not.toBeInTheDocument();
	expect(screen.getByRole('alert')).toHaveTextContent('responsável pela equipe da plataforma');
});
it('rejects access returned for a different logged in user', async () => {
	mockFetch([['/api/super-admin/iam/access', () => jsonResponse({ ...platformRoot, userId: 'another-user' })]]);
	renderWithProviders(
		<PlatformPermissionsProvider initialAccess={platformRoot}>
			<PlatformBoundary>
				<p>Dados protegidos</p>
			</PlatformBoundary>
		</PlatformPermissionsProvider>,
	);
	await waitFor(() => expect(screen.queryByText('Dados protegidos')).not.toBeInTheDocument());
});
it('disables sensitive form controls for readers while keeping values visible', () => {
	renderWithPlatformPermissions(
		<PlatformWrite permission="platform_settings.update">
			<label>
				Taxa
				<input value="3,50" readOnly />
			</label>
			<button>Salvar</button>
		</PlatformWrite>,
		{ userId: 'reader', active: true, isRoot: false, permissions: ['platform_settings.read'] },
	);
	expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
	expect(screen.getByLabelText('Taxa')).toHaveValue('3,50');
});
