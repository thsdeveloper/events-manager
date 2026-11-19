import { screen, waitFor } from '@testing-library/react';
import { it, expect } from 'vitest';
import { PlatformTeamScope, PlatformPermissionContext } from '@/features/platform-access/PlatformPermissions';
import { platformRoot } from '@/test/platform';
import { renderWithProviders, mockFetch, jsonResponse } from '@/test';
import { TeamManagement } from './TeamManagement';
it('manages platform roles and invitations without organization or event scope', async () => {
	const fetcher = mockFetch([
		[
			/\/api\/super-admin\/iam\//,
			(url, init) =>
				jsonResponse(
					init?.method
						? { delivery: 'sent' }
						: {
								data: String(url).includes('/roles')
									? [
											{
												id: '10000000-0000-4000-8000-000000000002',
												key: 'support',
												name: 'Atendimento',
												description: '',
												organization_id: null,
												permissions: ['platform_organizers.read'],
											},
										]
									: [],
							},
				),
		],
	]);
	const { user } = renderWithProviders(
		<PlatformPermissionContext.Provider value={platformRoot}>
			<PlatformTeamScope>
				<TeamManagement />
			</PlatformTeamScope>
		</PlatformPermissionContext.Provider>,
	);
	expect(screen.getByRole('heading', { name: 'Equipe da plataforma' })).toBeInTheDocument();
	await user.click(screen.getByRole('button', { name: 'Convidar membro' }));
	await screen.findByRole('option', { name: 'Atendimento' });
	expect(screen.queryByLabelText('Escopo 1')).not.toBeInTheDocument();
	await user.type(screen.getByLabelText('E-mail do convidado'), 'member@example.test');
	await user.selectOptions(screen.getByLabelText('Cargo 1'), '10000000-0000-4000-8000-000000000002');
	await user.click(screen.getByRole('button', { name: 'Enviar convite' }));
	await waitFor(() =>
		expect(fetcher).toHaveBeenCalledWith(
			'/api/super-admin/iam/invitations',
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({
					email: 'member@example.test',
					assignments: [{ roleId: '10000000-0000-4000-8000-000000000002', eventId: null }],
				}),
			}),
		),
	);
	await user.click(screen.getByRole('tab', { name: 'Cargos' }));
	await user.click(screen.getByRole('button', { name: 'Criar cargo' }));
	expect(screen.getByRole('checkbox', { name: 'Consultar transações, saldos e repasses' })).toBeInTheDocument();
	expect(screen.queryByRole('checkbox', { name: 'Validar entradas' })).not.toBeInTheDocument();
});
