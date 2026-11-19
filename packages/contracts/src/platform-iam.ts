import { z } from 'zod';
import { iamAssignmentsSchema } from './iam.js';
export const platformPermissionDefinitions = [
	{
		key: 'platform_overview.read',
		module: 'Visão geral',
		label: 'Consultar indicadores da plataforma',
	},
	{
		key: 'platform_organizers.read',
		module: 'Organizadores',
		label: 'Consultar organizadores e eventos',
	},
	{
		key: 'platform_organizers.update',
		module: 'Organizadores',
		label: 'Editar cadastro, status e atendimento',
	},
	{
		key: 'platform_finance.read',
		module: 'Financeiro',
		label: 'Consultar transações, saldos e repasses',
	},
	{
		key: 'platform_payouts.execute',
		module: 'Financeiro',
		label: 'Executar, concluir e cancelar repasses',
	},
	{
		key: 'platform_receiving.read',
		module: 'Validação cadastral',
		label: 'Consultar contas de recebimento e documentos',
	},
	{
		key: 'platform_receiving.review',
		module: 'Validação cadastral',
		label: 'Aprovar ou rejeitar dados de recebimento',
	},
	{
		key: 'platform_settings.read',
		module: 'Taxas e gateway',
		label: 'Consultar taxas e gateway',
	},
	{
		key: 'platform_settings.update',
		module: 'Taxas e gateway',
		label: 'Alterar taxas e gateway',
	},
	{
		key: 'platform_branding.read',
		module: 'Identidade visual',
		label: 'Consultar identidade visual',
	},
	{
		key: 'platform_branding.update',
		module: 'Identidade visual',
		label: 'Alterar identidade visual',
	},
	{
		key: 'platform_categories.read',
		module: 'Categorias',
		label: 'Consultar categorias',
	},
	{
		key: 'platform_categories.update',
		module: 'Categorias',
		label: 'Criar, editar e excluir categorias',
	},
	{
		key: 'platform_content.read',
		module: 'Conteúdo',
		label: 'Consultar indicadores de conteúdo',
	},
	{
		key: 'platform_pages.read',
		module: 'Páginas',
		label: 'Consultar páginas e versões',
	},
	{
		key: 'platform_pages.update',
		module: 'Páginas',
		label: 'Criar, editar e excluir páginas',
	},
	{
		key: 'platform_pages.publish',
		module: 'Páginas',
		label: 'Publicar ou despublicar páginas',
	},
	{
		key: 'platform_posts.read',
		module: 'Blog',
		label: 'Consultar posts',
	},
	{
		key: 'platform_posts.update',
		module: 'Blog',
		label: 'Criar, editar e excluir posts',
	},
	{
		key: 'platform_posts.publish',
		module: 'Blog',
		label: 'Publicar ou despublicar posts',
	},
	{
		key: 'platform_navigation.read',
		module: 'Menus',
		label: 'Consultar menus',
	},
	{
		key: 'platform_navigation.update',
		module: 'Menus',
		label: 'Alterar menus',
	},
	{
		key: 'platform_forms.read',
		module: 'Formulários',
		label: 'Consultar formulários e respostas',
	},
	{
		key: 'platform_forms.update',
		module: 'Formulários',
		label: 'Alterar formulários',
	},
	{
		key: 'platform_redirects.read',
		module: 'Redirecionamentos',
		label: 'Consultar redirecionamentos',
	},
	{
		key: 'platform_redirects.update',
		module: 'Redirecionamentos',
		label: 'Alterar redirecionamentos',
	},
	{
		key: 'platform_media.read',
		module: 'Mídia',
		label: 'Consultar biblioteca de mídia',
	},
	{
		key: 'platform_media.update',
		module: 'Mídia',
		label: 'Editar e excluir mídia',
	},
	{
		key: 'platform_site.read',
		module: 'Site e SEO',
		label: 'Consultar configurações do site',
	},
	{
		key: 'platform_site.update',
		module: 'Site e SEO',
		label: 'Alterar configurações do site',
	},
	{
		key: 'platform_users.read',
		module: 'Equipe da plataforma',
		label: 'Consultar membros e convites',
	},
	{
		key: 'platform_users.invite',
		module: 'Equipe da plataforma',
		label: 'Convidar e revogar convites',
	},
	{
		key: 'platform_users.update',
		module: 'Equipe da plataforma',
		label: 'Alterar cargos e suspender acessos',
	},
	{
		key: 'platform_users.remove',
		module: 'Equipe da plataforma',
		label: 'Remover membros',
	},
	{
		key: 'platform_roles.read',
		module: 'Cargos da plataforma',
		label: 'Consultar cargos e permissões',
	},
	{
		key: 'platform_roles.create',
		module: 'Cargos da plataforma',
		label: 'Criar cargos',
	},
	{
		key: 'platform_roles.update',
		module: 'Cargos da plataforma',
		label: 'Editar cargos',
	},
	{
		key: 'platform_roles.delete',
		module: 'Cargos da plataforma',
		label: 'Excluir cargos',
	},
	{
		key: 'platform_audit.read',
		module: 'Auditoria',
		label: 'Consultar auditoria da equipe da plataforma',
	},
] as const;
export type PlatformPermission = (typeof platformPermissionDefinitions)[number]['key'];
export const platformPermissionSchema = z.enum(
	platformPermissionDefinitions.map((p) => p.key) as [PlatformPermission, ...PlatformPermission[]],
);
export const platformRoleSchema = z
	.object({
		name: z.string().trim().min(2).max(80),
		description: z.string().trim().max(500).default(''),
		permissions: z
			.array(platformPermissionSchema)
			.min(1)
			.max(100)
			.transform((v) => [...new Set(v)]),
	})
	.strict();
export const platformAssignmentsSchema = iamAssignmentsSchema.refine(
	(values) => values.every((a) => a.eventId === null),
	'A equipe da plataforma não usa escopo de evento.',
);
export const platformInvitationSchema = z
	.object({ email: z.string().trim().toLowerCase().email().max(254), assignments: platformAssignmentsSchema })
	.strict();
export const platformMemberSchema = z
	.object({ status: z.enum(['active', 'suspended']), assignments: platformAssignmentsSchema })
	.strict();
export interface PlatformAccess {
	userId: string;
	active: boolean;
	isRoot: boolean;
	permissions: PlatformPermission[];
}
export interface PlatformRole {
	id: string;
	key: string | null;
	name: string;
	description: string;
	organization_id: null;
	permissions: PlatformPermission[];
}
export function hasPlatformPermission(
	access: { active: boolean; permissions: readonly string[]; isRoot?: boolean } | null | undefined,
	permission: string,
): boolean {
	return Boolean(
		access?.active && platformPermissionSchema.safeParse(permission).success && access.permissions.includes(permission),
	);
}
