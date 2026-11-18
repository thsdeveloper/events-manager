import { z } from 'zod';

export const permissionDefinitions = [
	{ key: 'dashboard.read', module: 'Visão geral', label: 'Consultar indicadores', scope: 'event' },
	{ key: 'events.create', module: 'Eventos', label: 'Criar eventos e rascunhos', scope: 'organization' },
	{ key: 'events.read', module: 'Eventos', label: 'Consultar eventos', scope: 'event' },
	{ key: 'events.update', module: 'Eventos', label: 'Editar eventos', scope: 'event' },
	{ key: 'events.delete', module: 'Eventos', label: 'Excluir eventos', scope: 'event' },
	{ key: 'events.publish', module: 'Eventos', label: 'Publicar eventos', scope: 'event' },
	{ key: 'tickets.read', module: 'Ingressos', label: 'Consultar tipos de ingresso', scope: 'event' },
	{ key: 'tickets.create', module: 'Ingressos', label: 'Criar tipos e grupos', scope: 'event' },
	{ key: 'tickets.update', module: 'Ingressos', label: 'Editar tipos e grupos', scope: 'event' },
	{ key: 'tickets.delete', module: 'Ingressos', label: 'Excluir tipos e grupos', scope: 'event' },
	{ key: 'participants.read', module: 'Participantes', label: 'Consultar participantes', scope: 'event' },
	{
		key: 'participants.update',
		module: 'Participantes',
		label: 'Editar participantes e reenviar ingressos',
		scope: 'event',
	},
	{ key: 'participants.cancel', module: 'Participantes', label: 'Cancelar inscrições', scope: 'event' },
	{ key: 'participants.export', module: 'Participantes', label: 'Exportar participantes', scope: 'event' },
	{ key: 'checkin.execute', module: 'Check-in', label: 'Validar entradas', scope: 'event' },
	{ key: 'checkin.undo', module: 'Check-in', label: 'Desfazer check-in', scope: 'event' },
	{ key: 'coupons.read', module: 'Cupons', label: 'Consultar cupons', scope: 'event' },
	{ key: 'coupons.create', module: 'Cupons', label: 'Criar cupons', scope: 'event' },
	{ key: 'coupons.update', module: 'Cupons', label: 'Editar cupons', scope: 'event' },
	{ key: 'coupons.delete', module: 'Cupons', label: 'Excluir cupons', scope: 'event' },
	{ key: 'event_pages.read', module: 'Página do evento', label: 'Consultar página', scope: 'event' },
	{ key: 'event_pages.update', module: 'Página do evento', label: 'Editar página', scope: 'event' },
	{ key: 'event_pages.publish', module: 'Página do evento', label: 'Publicar página', scope: 'event' },
	{ key: 'finance.read', module: 'Financeiro', label: 'Consultar vendas e receitas', scope: 'event' },
	{ key: 'finance.export', module: 'Financeiro', label: 'Exportar financeiro', scope: 'event' },
	{ key: 'refunds.create', module: 'Financeiro', label: 'Efetuar reembolsos', scope: 'event' },
	{ key: 'reports.read', module: 'Relatórios', label: 'Consultar análises financeiras', scope: 'event' },
	{
		key: 'payouts.read',
		module: 'Financeiro',
		label: 'Consultar saldo e repasses da organização',
		scope: 'organization',
	},
	{ key: 'organization.read', module: 'Organização', label: 'Consultar configurações', scope: 'organization' },
	{ key: 'organization.update', module: 'Organização', label: 'Editar dados da organização', scope: 'organization' },
	{ key: 'payments.configure', module: 'Organização', label: 'Configurar meios de pagamento', scope: 'organization' },
	{ key: 'users.read', module: 'Equipe', label: 'Consultar membros e convites', scope: 'organization' },
	{ key: 'users.invite', module: 'Equipe', label: 'Convidar membros e revogar convites', scope: 'organization' },
	{ key: 'users.update', module: 'Equipe', label: 'Alterar atribuições e suspender acessos', scope: 'organization' },
	{ key: 'users.remove', module: 'Equipe', label: 'Remover membros', scope: 'organization' },
	{ key: 'roles.read', module: 'Cargos', label: 'Consultar cargos e permissões', scope: 'organization' },
	{ key: 'roles.create', module: 'Cargos', label: 'Criar cargos personalizados', scope: 'organization' },
	{ key: 'roles.update', module: 'Cargos', label: 'Editar cargos personalizados', scope: 'organization' },
	{ key: 'roles.delete', module: 'Cargos', label: 'Excluir cargos personalizados', scope: 'organization' },
	{ key: 'audit.read', module: 'Auditoria', label: 'Consultar histórico de acessos da equipe', scope: 'organization' },
] as const;
export type Permission = (typeof permissionDefinitions)[number]['key'];
export const permissionSchema = z.enum(permissionDefinitions.map((p) => p.key) as [Permission, ...Permission[]]);
const operational = permissionDefinitions
	.filter((p) => ['Eventos', 'Ingressos', 'Participantes', 'Check-in', 'Cupons', 'Página do evento'].includes(p.module))
	.map((p) => p.key);
export const builtinRoles: Array<{ key: string; name: string; description: string; permissions: Permission[] }> = [
	{
		key: 'owner',
		name: 'Proprietário',
		description: 'Responsável pela organização. Vínculo protegido.',
		permissions: permissionDefinitions.map((p) => p.key),
	},
	{
		key: 'administrator',
		name: 'Administrador',
		description: 'Operação e equipe. Sem ações financeiras por padrão.',
		permissions: [
			...operational,
			'organization.read',
			'organization.update',
			'users.read',
			'users.invite',
			'users.update',
			'users.remove',
			'roles.read',
			'roles.create',
			'roles.update',
			'roles.delete',
			'audit.read',
		],
	},
	{
		key: 'event_manager',
		name: 'Gerente de eventos',
		description: 'Gerencia a operação dos eventos atribuídos.',
		permissions: operational.filter((p) => !['events.create', 'events.delete', 'participants.cancel'].includes(p)),
	},
	{
		key: 'finance',
		name: 'Financeiro',
		description: 'Consulta de receitas e relatórios, sem reembolsos ou configuração de pagamentos.',
		permissions: [
			'events.read',
			'tickets.read',
			'finance.read',
			'finance.export',
			'reports.read',
			'dashboard.read',
			'payouts.read',
		],
	},
	{
		key: 'checkin',
		name: 'Operador de check-in',
		description: 'Consulta participantes e valida entradas dos eventos autorizados.',
		permissions: ['events.read', 'participants.read', 'checkin.execute'],
	},
];
export const iamAssignmentSchema = z
	.object({ roleId: z.string().uuid(), eventId: z.string().uuid().nullable() })
	.strict();
export const iamAssignmentsSchema = z
	.array(iamAssignmentSchema)
	.min(1)
	.max(100)
	.refine(
		(items) => new Set(items.map((a) => `${a.roleId}:${a.eventId ?? '*'}`)).size === items.length,
		'Não repita o mesmo cargo no mesmo escopo.',
	);
export const iamInvitationSchema = z
	.object({ email: z.string().trim().toLowerCase().email().max(254), assignments: iamAssignmentsSchema })
	.strict();
export const iamRoleInputSchema = z
	.object({
		name: z.string().trim().min(2).max(80),
		description: z.string().trim().max(500).default(''),
		permissions: z
			.array(permissionSchema)
			.min(1)
			.max(100)
			.transform((values) => [...new Set(values)]),
	})
	.strict();
export const iamMemberInputSchema = z
	.object({ status: z.enum(['active', 'suspended']), assignments: iamAssignmentsSchema })
	.strict();
export const iamTokenSchema = z
	.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/, 'Convite inválido.') })
	.strict();
export type IamAssignment = z.infer<typeof iamAssignmentSchema>;
export type IamRoleInput = z.infer<typeof iamRoleInputSchema>;
export interface IamAccess {
	organizationId: string;
	userId: string;
	isOwner: boolean;
	active: boolean;
	permissions: Permission[];
	events: Array<{ eventId: string; permissions: Permission[] }>;
}
export interface IamRole {
	id: string;
	key: string | null;
	name: string;
	description: string;
	organization_id: string | null;
	permissions: Permission[];
}
export interface IamMember {
	id: string;
	user_id: string;
	status: 'active' | 'suspended' | 'removed';
	isOwner: boolean;
	name: string;
	email: string;
	assignments: IamAssignment[];
	created_at: string;
}
export interface IamInvitation {
	id: string;
	email: string;
	status: 'pending' | 'accepted' | 'revoked';
	expires_at: string;
	created_at: string;
	assignments: IamAssignment[];
}
export function hasPermission(
	access: IamAccess | null | undefined,
	action: Permission,
	eventId?: string | null,
): boolean {
	if (!access?.active) return false;
	if (access.permissions.includes(action)) return true;
	return Boolean(
		eventId &&
			permissionDefinitions.find((p) => p.key === action)?.scope === 'event' &&
			access.events.some((e) => e.eventId === eventId && e.permissions.includes(action)),
	);
}
export function hasAnyEventPermission(access: IamAccess | null | undefined, action: Permission): boolean {
	return (
		hasPermission(access, action) ||
		Boolean(
			access?.active &&
				permissionDefinitions.find((p) => p.key === action)?.scope === 'event' &&
				access.events.some((e) => e.permissions.includes(action)),
		)
	);
}
