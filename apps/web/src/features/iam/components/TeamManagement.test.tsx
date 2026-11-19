import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { permissionDefinitions, type IamAccess } from '@events-manager/contracts';
import { renderWithProviders, mockFetch, jsonResponse, problemResponse } from '@/test';
import { PermissionContext } from '@/components/auth/PermissionsProvider';
import { TeamManagement } from './TeamManagement';
const org = '22222222-2222-4222-8222-222222222222',
	role = '33333333-3333-4333-8333-333333333333',
	event = '44444444-4444-4444-8444-444444444444';
const access: IamAccess = {
	userId: 'owner',
	organizationId: org,
	isOwner: true,
	active: true,
	permissions: permissionDefinitions.map((p) => p.key),
	events: [],
};
function setup(permissions = access.permissions, extras = false) {
	const fetchMock = mockFetch([
		[
			'/api/organizer/iam/members',
			(_url, init) =>
				init?.method
					? jsonResponse({})
					: jsonResponse({
							data: [
								{
									id: 'owner',
									user_id: 'owner',
									name: 'Proprietário',
									email: 'owner@test.com',
									isOwner: true,
									status: 'active',
									assignments: [],
								},
								{
									id: 'member',
									user_id: 'operator',
									name: 'Operador',
									email: 'operator@test.com',
									isOwner: false,
									status: 'active',
									assignments: [{ roleId: role, eventId: event }],
								},
							],
						}),
		],
		[
			'/api/organizer/iam/roles',
			(_url, init) =>
				jsonResponse(
					init?.method
						? { id: role }
						: {
								data: [
									...(extras
										? [
												{
													id: 'custom',
													key: null,
													name: 'Recepção',
													description: 'Portaria',
													organization_id: org,
													permissions: ['checkin.execute'],
												},
											]
										: []),
									{
										id: role,
										key: 'checkin',
										name: 'Operador de check-in',
										organization_id: null,
										permissions: ['checkin.execute'],
										description: '',
									},
								],
							},
				),
		],
		[
			'/api/organizer/iam/invitations',
			(_url, init) =>
				jsonResponse(
					init?.method
						? { delivery: 'sent', invitation: { id: 'invite' } }
						: {
								data: extras
									? [
											{
												id: 'invite',
												email: 'pending@test.com',
												status: 'pending',
												expires_at: '2099-12-01',
												created_at: '2026-11-18',
												assignments: [],
											},
										]
									: [],
							},
				),
		],
		['/api/organizer/iam/events', () => jsonResponse({ data: [{ id: event, title: 'Evento A' }] })],
		[
			/\/api\/organizer\/iam\/audit/,
			() =>
				jsonResponse({
					data: extras
						? [{ id: 'audit', actor_id: 'owner', action: 'iam.roles.update', date_created: '2026-11-18T12:00:00Z' }]
						: [],
					total: extras ? 26 : 0,
					page: 1,
				}),
		],
	]);
	const view = renderWithProviders(
		<PermissionContext.Provider value={{ ...access, permissions }}>
			<TeamManagement />
		</PermissionContext.Provider>,
	);

	return { ...view, fetchMock };
}
describe('team management', () => {
	it('lists members and searches by name or email', async () => {
		const { user } = setup();
		expect(await screen.findByText('operator@test.com')).toBeInTheDocument();
		await user.type(screen.getByLabelText('Buscar membros'), 'operator@');
		expect(screen.queryByText('owner@test.com')).not.toBeInTheDocument();
	});
	it('invites a member with a role restricted to an event', async () => {
		const { user, fetchMock } = setup();
		await screen.findByText('operator@test.com');
		await user.click(screen.getByRole('button', { name: 'Convidar membro' }));
		const dialog = screen.getByRole('dialog');
		await user.type(within(dialog).getByLabelText('E-mail do convidado'), 'guest@test.com');
		await user.selectOptions(within(dialog).getByLabelText('Cargo 1'), role);
		await user.selectOptions(within(dialog).getByLabelText('Escopo 1'), event);
		await user.click(within(dialog).getByRole('button', { name: 'Enviar convite' }));
		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				'/api/organizer/iam/invitations',
				expect.objectContaining({
					method: 'POST',
					body: JSON.stringify({ email: 'guest@test.com', assignments: [{ roleId: role, eventId: event }] }),
				}),
			),
		);
	});
	it('creates a custom role from the grouped permission matrix', async () => {
		const { user, fetchMock } = setup();
		await user.click(screen.getByRole('tab', { name: 'Cargos' }));
		await screen.findByText('Operador de check-in');
		await user.click(screen.getByRole('button', { name: 'Criar cargo' }));
		const dialog = screen.getByRole('dialog');
		await user.type(within(dialog).getByLabelText('Nome do cargo'), 'Recepção');
		await user.click(within(dialog).getByRole('checkbox', { name: 'Validar entradas' }));
		await user.click(within(dialog).getByRole('button', { name: 'Salvar cargo' }));
		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				'/api/organizer/iam/roles',
				expect.objectContaining({
					method: 'POST',
					body: JSON.stringify({ name: 'Recepção', description: '', permissions: ['checkin.execute'] }),
				}),
			),
		);
	});
	it('hides invitation and role mutations without explicit authority', async () => {
		setup(['users.read']);
		await screen.findByText('operator@test.com');
		expect(screen.queryByRole('button', { name: 'Convidar membro' })).not.toBeInTheDocument();
		expect(screen.queryByRole('tab', { name: 'Cargos' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Editar Operador' })).not.toBeInTheDocument();
	});
	it('does not offer removal of the organization owner', async () => {
		setup();
		await screen.findByText('owner@test.com');
		expect(screen.queryByRole('button', { name: 'Remover Proprietário' })).not.toBeInTheDocument();
	});
});

describe('team access changes and review', () => {
	it('suspends a member while preserving explicit event assignments', async () => {
		const { user, fetchMock } = setup();
		await user.click(await screen.findByRole('button', { name: 'Editar Operador' }));
		const dialog = screen.getByRole('dialog');
		await user.selectOptions(within(dialog).getByLabelText('Status do acesso'), 'suspended');
		await user.click(within(dialog).getByRole('button', { name: 'Salvar acesso' }));
		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				'/api/organizer/iam/members/member',
				expect.objectContaining({
					method: 'PATCH',
					body: JSON.stringify({ status: 'suspended', assignments: [{ roleId: role, eventId: event }] }),
				}),
			),
		);
	});
	it('asks for confirmation and allows cancelling a removal', async () => {
		const { user, fetchMock } = setup();
		await user.click(await screen.findByRole('button', { name: 'Remover Operador' }));
		await user.click(screen.getByRole('button', { name: 'Cancelar' }));
		expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
		await user.click(screen.getByRole('button', { name: 'Remover Operador' }));
		await user.click(screen.getByRole('button', { name: 'Confirmar' }));
		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				'/api/organizer/iam/members/member',
				expect.objectContaining({ method: 'DELETE' }),
			),
		);
	});
	it('filters members by status', async () => {
		const { user } = setup();
		await screen.findByText('operator@test.com');
		await user.selectOptions(screen.getByLabelText('Status', { exact: true }), 'suspended');
		expect(screen.getByText('Nenhum membro encontrado.')).toBeInTheDocument();
	});
	it('allows multiple assignments and removal of an extra assignment', async () => {
		const { user } = setup();
		await user.click(screen.getByRole('button', { name: 'Convidar membro' }));
		await user.click(screen.getByRole('button', { name: 'Adicionar atribuição' }));
		await user.selectOptions(screen.getByLabelText('Cargo 2'), role);
		await user.selectOptions(screen.getByLabelText('Escopo 2'), event);
		await user.click(screen.getByRole('button', { name: 'Remover atribuição 2' }));
		expect(screen.queryByLabelText('Cargo 2')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Enviar convite' })).toBeDisabled();
	});
	it('shows default roles as read-only', async () => {
		const { user } = setup();
		await user.click(screen.getByRole('tab', { name: 'Cargos' }));
		await user.click(await screen.findByRole('button', { name: 'Ver permissões' }));
		expect(screen.getByLabelText('Nome do cargo')).toBeDisabled();
		expect(screen.getByRole('checkbox', { name: 'Validar entradas' })).toBeChecked();
		expect(screen.queryByRole('button', { name: 'Salvar cargo' })).not.toBeInTheDocument();
	});
	it('edits and deletes custom roles with confirmation', async () => {
		const { user, fetchMock } = setup(undefined, true);
		await user.click(screen.getByRole('tab', { name: 'Cargos' }));
		await user.click(await screen.findByRole('button', { name: 'Ver permissões e editar' }));
		await user.clear(screen.getByLabelText('Nome do cargo'));
		await user.type(screen.getByLabelText('Nome do cargo'), 'Recepção revisada');
		await user.click(screen.getByRole('checkbox', { name: 'Consultar participantes' }));
		await user.click(screen.getByRole('button', { name: 'Salvar cargo' }));
		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				'/api/organizer/iam/roles/custom',
				expect.objectContaining({ method: 'PATCH' }),
			),
		);
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
		await user.click(screen.getByRole('button', { name: 'Excluir' }));
		await user.click(screen.getByRole('button', { name: 'Confirmar' }));
		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				'/api/organizer/iam/roles/custom',
				expect.objectContaining({ method: 'DELETE' }),
			),
		);
	});
	it('resends and revokes pending invitations', async () => {
		const { user, fetchMock } = setup(undefined, true);
		await user.click(screen.getByRole('tab', { name: 'Convites' }));
		await user.click(await screen.findByRole('button', { name: 'Reenviar' }));
		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				'/api/organizer/iam/invitations/invite/resend',
				expect.objectContaining({ method: 'POST' }),
			),
		);
		await user.click(screen.getByRole('button', { name: 'Revogar' }));
		await user.click(screen.getByRole('button', { name: 'Confirmar' }));
		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				'/api/organizer/iam/invitations/invite',
				expect.objectContaining({ method: 'DELETE' }),
			),
		);
	});
	it('shows audit actors and navigates the audit history', async () => {
		const { user, fetchMock } = setup(undefined, true);
		await user.click(screen.getByRole('tab', { name: 'Histórico' }));
		expect(await screen.findByText('Permissões alteradas')).toBeInTheDocument();
		expect(screen.getByText('Proprietário')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Próxima' }));
		await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/organizer/iam/audit?page=2', expect.anything()));
		await user.click(screen.getByRole('button', { name: 'Anterior' }));
		expect(screen.getByText('Página 1')).toBeInTheDocument();
	});
	it('keeps a role draft editable when the API refuses a save', async () => {
		const { user, fetchMock } = setup();
		await user.click(screen.getByRole('tab', { name: 'Cargos' }));
		await user.click(screen.getByRole('button', { name: 'Criar cargo' }));
		await user.type(screen.getByLabelText('Nome do cargo'), 'Tentativa');
		await user.click(screen.getByRole('checkbox', { name: 'Validar entradas' }));
		fetchMock.mockImplementationOnce(async () => problemResponse(403, 'IAM_CANNOT_DELEGATE', 'Permissão revogada.'));
		await user.click(screen.getByRole('button', { name: 'Salvar cargo' }));
		await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar cargo' })).toBeEnabled());
		expect(screen.getByLabelText('Nome do cargo')).toHaveValue('Tentativa');
	});
});
