'use client';
import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { IamAssignment, IamMember, IamInvitation } from '@events-manager/contracts';
import { Users, UserPlus, ShieldCheck } from 'lucide-react';
import { useTeamRuntime, type TeamRole } from '../api/team-runtime';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { NativeSelect } from '@/components/ui/native-select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useTeamQuery, useTeamMutation } from '../api/team';
import { AssignmentEditor, type TeamEvent } from './AssignmentEditor';
import { RoleEditor } from './RoleEditor';
type AuditEntry = {
	id: string;
	action: string;
	actor_id: string | null;
	resource_id: string | null;
	date_created: string;
};
const statusLabel: Record<string, string> = {
	active: 'Ativo',
	suspended: 'Suspenso',
	removed: 'Removido',
	pending: 'Pendente',
	accepted: 'Aceito',
	revoked: 'Revogado',
};
const actionLabel: Record<string, string> = {
	'roles.create': 'Cargo criado',
	'roles.update': 'Permissões alteradas',
	'roles.delete': 'Cargo excluído',
	'members.update': 'Acesso alterado',
	'members.remove': 'Membro removido',
	'invitations.create': 'Convite enviado',
	'invitations.accept': 'Convite aceito',
	'invitations.revoke': 'Convite revogado',
	'invitations.resend': 'Convite reenviado',
	'access.denied': 'Acesso negado',
};
export function TeamManagement() {
	const { scope, can, canAny, canDelegate } = useTeamRuntime();
	const [search, setSearch] = useState('');
	const [status, setStatus] = useState('all');
	const [page, setPage] = useState(1);
	const members = useTeamQuery<{ data: IamMember[] }>('members', can('users.read'));
	const roles = useTeamQuery<{ data: TeamRole[] }>('roles', can('roles.read'));
	const events = useTeamQuery<{ data: TeamEvent[] }>('events', scope === 'organization' && canAny('events.read'));
	const invitations = useTeamQuery<{ data: IamInvitation[] }>('invitations', can('users.read'));
	const audit = useTeamQuery<{ data: AuditEntry[]; total: number }>(`audit?page=${page}`, can('audit.read'));
	const mutation = useTeamMutation();
	const [invite, setInvite] = useState(false);
	const [email, setEmail] = useState('');
	const [assignments, setAssignments] = useState<IamAssignment[]>([{ roleId: '', eventId: null }]);
	const [member, setMember] = useState<IamMember | null>(null);
	const [memberStatus, setMemberStatus] = useState<'active' | 'suspended'>('active');
	const [roleDialog, setRoleDialog] = useState<TeamRole | 'new' | null>(null);
	const [confirmation, setConfirmation] = useState<{ path: string; label: string } | null>(null);
	const roleList = roles.data?.data ?? [];
	const eventList = events.data?.data ?? [];
	const mayEdit = (m: IamMember) =>
		!m.isOwner &&
		m.assignments.every((a) => {
			const role = roleList.find((r) => r.id === a.roleId);

			return role && canDelegate(role, a.eventId);
		});
	const validAssignments =
		assignments.length > 0 &&
		assignments.every((a) => {
			const role = roleList.find((r) => r.id === a.roleId);

			return role && canDelegate(role, a.eventId);
		});
	const save = (path: string, method: string, body?: unknown, close?: () => void) =>
		mutation.mutate({ path, method, body }, { onSuccess: () => close?.() });
	const columns: ColumnDef<IamMember>[] = [
		{
			accessorKey: 'name',
			header: 'Membro',
			cell: ({ row }) => (
				<div>
					<p className="font-medium">
						{row.original.name || 'Sem nome'}{' '}
						{row.original.isOwner && (
							<Badge variant="secondary">{scope === 'platform' ? 'Super-admin principal' : 'Proprietário'}</Badge>
						)}
					</p>
					<p className="text-sm text-muted-foreground">{row.original.email}</p>
				</div>
			),
		},
		{
			accessorKey: 'status',
			header: 'Status',
			cell: ({ row }) => <Badge variant="outline">{statusLabel[row.original.status]}</Badge>,
		},
		{
			id: 'roles',
			header: 'Cargos e acesso',
			cell: ({ row }) =>
				row.original.isOwner ? (
					scope === 'platform' ? (
						'Plataforma'
					) : (
						'Toda a organização'
					)
				) : (
					<ul className="space-y-1 text-sm">
						{row.original.assignments.map((a, i) => (
							<li key={i}>
								{roleList.find((r) => r.id === a.roleId)?.name ?? 'Cargo atribuído'} ·{' '}
								{a.eventId
									? (eventList.find((e) => e.id === a.eventId)?.title ?? 'Evento específico')
									: scope === 'platform'
										? 'Plataforma'
										: 'Todos os eventos'}
							</li>
						))}
					</ul>
				),
		},
		{
			id: 'actions',
			header: 'Ações',
			cell: ({ row }) => (
				<div className="flex gap-2">
					{can('users.update') && mayEdit(row.original) && row.original.status !== 'removed' && (
						<Button
							variant="outline"
							size="sm"
							aria-label={`Editar ${row.original.name}`}
							onClick={() => {
								setMember(row.original);
								setAssignments(
									row.original.assignments.length ? row.original.assignments : [{ roleId: '', eventId: null }],
								);
								setMemberStatus(row.original.status === 'suspended' ? 'suspended' : 'active');
							}}
						>
							Editar
						</Button>
					)}
					{can('users.remove') && mayEdit(row.original) && row.original.status !== 'removed' && (
						<Button
							variant="ghost"
							size="sm"
							aria-label={`Remover ${row.original.name}`}
							onClick={() =>
								setConfirmation({
									path: `members/${row.original.id}`,
									label: `Remover o acesso de ${row.original.name}?`,
								})
							}
						>
							Remover
						</Button>
					)}
				</div>
			),
		},
	];
	const errors = [members.error, roles.error, events.error, invitations.error, audit.error].filter(Boolean);

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="flex items-center gap-2 text-2xl font-semibold">
						<Users className="size-6" />
						{scope === 'platform' ? 'Equipe da plataforma' : 'Equipe e permissões'}
					</h1>
					<p className="mt-2 text-muted-foreground">
						{scope === 'platform'
							? 'Defina quem pode acessar a administração da plataforma e quais informações pode consultar ou alterar.'
							: 'Defina quem participa da organização e o que cada pessoa pode fazer.'}
					</p>
				</div>
				{can('users.invite') && can('roles.read') && (
					<Button
						onClick={() => {
							setEmail('');
							setAssignments([{ roleId: '', eventId: null }]);
							setInvite(true);
						}}
					>
						<UserPlus className="mr-2 size-4" />
						Convidar membro
					</Button>
				)}
			</div>
			{errors.length > 0 && (
				<div role="alert" className="rounded-lg border border-destructive p-4 text-sm">
					{errors.map((e) => e?.message).join(' ')}
				</div>
			)}
			<Tabs defaultValue={can('users.read') ? 'members' : 'roles'}>
				<TabsList>
					{can('users.read') && <TabsTrigger value="members">Membros</TabsTrigger>}
					{can('users.read') && <TabsTrigger value="invitations">Convites</TabsTrigger>}
					{can('roles.read') && <TabsTrigger value="roles">Cargos</TabsTrigger>}
					{can('audit.read') && <TabsTrigger value="audit">Histórico</TabsTrigger>}
				</TabsList>
				{can('users.read') && (
					<TabsContent value="members" className="space-y-4 pt-4">
						<div className="flex flex-wrap gap-4">
							<label className="min-w-60 flex-1 space-y-2 text-sm">
								Buscar membros
								<Input placeholder="Nome ou e-mail" value={search} onChange={(e) => setSearch(e.target.value)} />
							</label>
							<label className="space-y-2 text-sm">
								Status
								<NativeSelect value={status} onChange={(e) => setStatus(e.target.value)}>
									<option value="all">Todos</option>
									{['active', 'suspended', 'removed'].map((s) => (
										<option key={s} value={s}>
											{statusLabel[s]}
										</option>
									))}
								</NativeSelect>
							</label>
						</div>
						<DataTable
							columns={columns}
							data={(members.data?.data ?? []).filter(
								(m) =>
									(status === 'all' || status === m.status) &&
									`${m.name} ${m.email}`.toLowerCase().includes(search.toLowerCase()),
							)}
							showToolbar={false}
							emptyMessage={members.isLoading ? 'Carregando equipe…' : 'Nenhum membro encontrado.'}
						/>
					</TabsContent>
				)}
				{can('users.read') && (
					<TabsContent value="invitations" className="space-y-3 pt-4">
						<p className="text-sm text-muted-foreground">
							Convites são válidos por 7 dias e só podem ser aceitos pela conta com o e-mail confirmado do destinatário.
						</p>
						{!invitations.data?.data.length && (
							<p className="rounded-lg border p-6 text-muted-foreground">Nenhum convite registrado.</p>
						)}
						{invitations.data?.data.map((invitation) => (
							<div
								key={invitation.id}
								className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"
							>
								<div>
									<p className="font-medium">{invitation.email}</p>
									<p className="text-sm text-muted-foreground">
										{invitation.status === 'pending' && new Date(invitation.expires_at) < new Date()
											? 'Expirado'
											: statusLabel[invitation.status]}{' '}
										· Validade: {new Date(invitation.expires_at).toLocaleDateString('pt-BR')}
									</p>
								</div>
								{can('users.invite') && invitation.status === 'pending' && (
									<div className="flex gap-2">
										<Button
											disabled={mutation.isPending}
											variant="outline"
											onClick={() => save(`invitations/${invitation.id}/resend`, 'POST')}
										>
											Reenviar
										</Button>
										<Button
											variant="ghost"
											onClick={() =>
												setConfirmation({
													path: `invitations/${invitation.id}`,
													label: `Revogar convite para ${invitation.email}?`,
												})
											}
										>
											Revogar
										</Button>
									</div>
								)}
							</div>
						))}
					</TabsContent>
				)}
				{can('roles.read') && (
					<TabsContent value="roles" className="space-y-4 pt-4">
						<div className="flex items-center justify-between gap-4">
							<p className="text-sm text-muted-foreground">
								Cargos padrão servem de referência. Personalize as permissões em um novo cargo.
							</p>
							{can('roles.create') && <Button onClick={() => setRoleDialog('new')}>Criar cargo</Button>}
						</div>
						<div className="grid gap-4 lg:grid-cols-2">
							{roleList.map((role) => (
								<div key={role.id} className="space-y-3 rounded-lg border p-5">
									<div className="flex items-center gap-2">
										<ShieldCheck className="size-5" />
										<h2 className="font-semibold">{role.name}</h2>
										<Badge variant="secondary">{role.key ? 'Padrão' : 'Personalizado'}</Badge>
									</div>
									<p className="text-sm text-muted-foreground">{role.description}</p>
									<p className="text-sm">{role.permissions.length} permissões</p>
									<div className="flex gap-2">
										<Button variant="outline" onClick={() => setRoleDialog(role)}>
											Ver permissões
											{!role.key && can('roles.update') && canDelegate(role, null) ? ' e editar' : ''}
										</Button>
										{!role.key && can('roles.delete') && canDelegate(role, null) && (
											<Button
												variant="ghost"
												onClick={() =>
													setConfirmation({ path: `roles/${role.id}`, label: `Excluir o cargo ${role.name}?` })
												}
											>
												Excluir
											</Button>
										)}
									</div>
								</div>
							))}
						</div>
					</TabsContent>
				)}
				{can('audit.read') && (
					<TabsContent value="audit" className="space-y-4 pt-4">
						<p className="text-sm text-muted-foreground">
							Alterações de acesso e tentativas negadas são registradas automaticamente.
						</p>
						<DataTable
							showToolbar={false}
							paginate={false}
							data={audit.data?.data ?? []}
							columns={[
								{
									accessorKey: 'date_created',
									header: 'Data',
									cell: ({ row }) => new Date(row.original.date_created).toLocaleString('pt-BR'),
								},
								{
									accessorKey: 'action',
									header: 'Ação',
									cell: ({ row }) => actionLabel[row.original.action.replace(/^iam\./, '')] ?? row.original.action,
								},
								{
									accessorKey: 'actor_id',
									header: 'Responsável',
									cell: ({ row }) =>
										members.data?.data.find((m) => m.user_id === row.original.actor_id)?.name ??
										'Usuário da plataforma',
								},
							]}
						/>
						<div className="flex justify-end gap-3">
							<Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
								Anterior
							</Button>
							<span className="self-center text-sm">Página {page}</span>
							<Button
								variant="outline"
								disabled={page * 25 >= (audit.data?.total ?? 0)}
								onClick={() => setPage((p) => p + 1)}
							>
								Próxima
							</Button>
						</div>
					</TabsContent>
				)}
			</Tabs>
			<Dialog
				open={invite || Boolean(member)}
				onOpenChange={(open) => {
					if (!open) {
						setInvite(false);
						setMember(null);
					}
				}}
			>
				<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
					<DialogHeader>
						<DialogTitle>{invite ? 'Convidar membro' : `Editar acesso de ${member?.name}`}</DialogTitle>
						<DialogDescription>
							Conceda apenas as permissões necessárias. A suspensão e a remoção interrompem este acesso.
						</DialogDescription>
					</DialogHeader>
					<form
						className="space-y-5"
						onSubmit={(e) => {
							e.preventDefault();
							if (!validAssignments) return;
							if (invite) save('invitations', 'POST', { email, assignments }, () => setInvite(false));
							else if (member)
								save(`members/${member.id}`, 'PATCH', { status: memberStatus, assignments }, () => setMember(null));
						}}
					>
						{invite ? (
							<label className="block space-y-2 text-sm">
								E-mail do convidado
								<Input type="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
							</label>
						) : (
							<label className="block space-y-2 text-sm">
								Status do acesso
								<NativeSelect
									value={memberStatus}
									onChange={(e) => setMemberStatus(e.target.value as 'active' | 'suspended')}
								>
									<option value="active">Ativo</option>
									<option value="suspended">Suspenso</option>
								</NativeSelect>
							</label>
						)}
						<AssignmentEditor value={assignments} onChange={setAssignments} roles={roleList} events={eventList} />
						<Button type="submit" disabled={mutation.isPending || !validAssignments}>
							{invite ? 'Enviar convite' : 'Salvar acesso'}
						</Button>
					</form>
				</DialogContent>
			</Dialog>
			<Dialog
				open={Boolean(roleDialog)}
				onOpenChange={(open) => {
					if (!open) setRoleDialog(null);
				}}
			>
				<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
					<DialogHeader>
						<DialogTitle>{roleDialog === 'new' ? 'Criar cargo' : 'Permissões do cargo'}</DialogTitle>
						<DialogDescription>Você só pode conceder permissões que possui neste ambiente.</DialogDescription>
					</DialogHeader>
					{roleDialog && (
						<RoleEditor
							key={roleDialog === 'new' ? 'new' : roleDialog.id}
							role={roleDialog === 'new' ? undefined : roleDialog}
							readOnly={
								roleDialog !== 'new' &&
								(Boolean(roleDialog.key) || !can('roles.update') || !canDelegate(roleDialog, null))
							}
							pending={mutation.isPending}
							onSave={(input) =>
								save(
									roleDialog === 'new' ? 'roles' : `roles/${roleDialog.id}`,
									roleDialog === 'new' ? 'POST' : 'PATCH',
									input,
									() => setRoleDialog(null),
								)
							}
						/>
					)}
				</DialogContent>
			</Dialog>
			<Dialog
				open={Boolean(confirmation)}
				onOpenChange={(open) => {
					if (!open) setConfirmation(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{confirmation?.label}</DialogTitle>
						<DialogDescription>A alteração passa a valer imediatamente. O histórico será preservado.</DialogDescription>
					</DialogHeader>
					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={() => setConfirmation(null)}>
							Cancelar
						</Button>
						<Button
							variant="destructive"
							disabled={mutation.isPending}
							onClick={() => confirmation && save(confirmation.path, 'DELETE', undefined, () => setConfirmation(null))}
						>
							Confirmar
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
