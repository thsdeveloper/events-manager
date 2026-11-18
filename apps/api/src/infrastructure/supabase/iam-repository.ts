import type { IamAccess, IamRole, IamMember, IamInvitation, Permission } from '@events-manager/contracts';
import type { TeamRepository } from '../../application/iam/team-service.js';
import { ApiError } from '../../shared/errors.js';
import type { SupabaseClients } from './clients.js';

export function iamDatabaseError(error: { message: string; code?: string }): never {
	const messages: Record<string, [number, string]> = {
		IAM_PERMISSION_DENIED: [403, 'Você não tem permissão para realizar esta ação.'],
		IAM_CANNOT_DELEGATE: [403, 'Você só pode conceder permissões que possui no mesmo escopo.'],
		IAM_OWNER_PROTECTED: [409, 'O vínculo do proprietário não pode ser alterado pela gestão de equipe.'],
		IAM_ROLE_SCOPE: [422, 'Selecione um cargo desta organização.'],
		IAM_EVENT_SCOPE: [422, 'Selecione um evento desta organização.'],
		IAM_ROLE_NOT_FOUND: [404, 'Cargo não encontrado.'],
		IAM_MEMBER_NOT_FOUND: [404, 'Membro não encontrado.'],
		IAM_ROLE_IN_USE: [409, 'Remova as atribuições e convites pendentes deste cargo antes de excluí-lo.'],
		IAM_INVITATION_INVALID: [409, 'Este convite expirou, já foi utilizado ou foi revogado.'],
		IAM_INVITATION_IDENTITY: [403, 'Entre com o e-mail que recebeu o convite e confirme esse endereço.'],
		IAM_MEMBER_SUSPENDED: [403, 'Seu acesso está suspenso. Fale com o proprietário da organização.'],
		IAM_EVENT_ROLE_EMPTY: [422, 'Este cargo não possui permissões aplicáveis a um evento.'],
	};
	const problem = messages[error.message];
	if (problem) throw new ApiError(problem[1], problem[0], error.message);
	if (error.code === '23505')
		throw new ApiError(
			'Já existe um cargo com esse nome ou um convite pendente para esse e-mail.',
			409,
			'IAM_DUPLICATE',
		);
	throw error;
}
export class SupabaseIamRepository implements TeamRepository {
	constructor(private readonly clients: SupabaseClients) {}
	async access(userId: string, organizationId: string): Promise<IamAccess> {
		const { data, error } = await this.clients.admin.rpc('iam_access_context', {
			actor: userId,
			organization: organizationId,
		});
		if (error) iamDatabaseError(error);
		return data as IamAccess;
	}
	async resourceEvent(table: 'event_tickets' | 'registration_tickets', id: string): Promise<string | null> {
		const { data, error } = await this.clients.admin.from(table).select('event_id').eq('id', id).maybeSingle();
		if (error) throw error;
		return (data?.event_id as string | undefined) ?? null;
	}
	async eventOrganization(eventId: string) {
		const { data, error } = await this.clients.admin
			.from('events')
			.select('organizer_id')
			.eq('id', eventId)
			.maybeSingle();
		if (error) throw error;
		return (data?.organizer_id as string | undefined) ?? null;
	}
	async recordDenied(input: { userId: string; organizationId: string; action: Permission; eventId?: string }) {
		const { error } = await this.clients.admin.from('audit_logs').insert({
			actor_id: input.userId,
			organization_id: input.organizationId,
			action: 'iam.access.denied',
			resource_type: 'permission',
			resource_id: input.eventId ?? input.organizationId,
			metadata: { permission: input.action },
		});
		if (error) throw error;
	}
	async members(organizationId: string): Promise<IamMember[]> {
		const { data, error } = await this.clients.admin
			.from('organization_members')
			.select(
				'id,user_id,status,created_at,profile:profiles!organization_members_user_id_fkey(first_name,last_name,email),assignments:role_assignments(role_id,event_id),organization:organizers(user_id)',
			)
			.eq('organization_id', organizationId)
			.order('created_at');
		if (error) throw error;
		return (data ?? []).map((row) => {
			const profile = row.profile as unknown as { first_name?: string; last_name?: string; email?: string } | null;
			const organization = row.organization as unknown as { user_id: string };
			const assignments = row.assignments as unknown as Array<{ role_id: string; event_id: string | null }>;
			return {
				id: row.id,
				user_id: row.user_id,
				status: row.status,
				created_at: row.created_at,
				name: [profile?.first_name, profile?.last_name].filter(Boolean).join(' '),
				email: profile?.email ?? '',
				isOwner: organization?.user_id === row.user_id,
				assignments: (assignments ?? []).map((a) => ({ roleId: a.role_id, eventId: a.event_id })),
			};
		});
	}
	async roles(organizationId: string): Promise<IamRole[]> {
		const { data, error } = await this.clients.admin
			.from('roles')
			.select('id,key,name,description,organization_id,permissions:role_permissions(permission)')
			.or(`organization_id.eq.${organizationId},organization_id.is.null`)
			.order('name');
		if (error) throw error;
		return (data ?? []).map((r) => ({
			...r,
			permissions: (r.permissions as unknown as Array<{ permission: Permission }>).map((p) => p.permission),
		})) as IamRole[];
	}
	async invitations(organizationId: string): Promise<IamInvitation[]> {
		const { data, error } = await this.clients.admin
			.from('user_invitations')
			.select('id,email,status,expires_at,created_at,assignments')
			.eq('organization_id', organizationId)
			.order('created_at', { ascending: false })
			.limit(200);
		if (error) throw error;
		return (data ?? []) as IamInvitation[];
	}
	async audit(organizationId: string, page: number) {
		const { data, error, count } = await this.clients.admin
			.from('audit_logs')
			.select('id,actor_id,action,resource_type,resource_id,before_data,after_data,metadata,date_created', {
				count: 'exact',
			})
			.eq('organization_id', organizationId)
			.like('action', 'iam.%')
			.order('date_created', { ascending: false })
			.range((page - 1) * 25, page * 25 - 1);
		if (error) throw error;
		return { data: data ?? [], total: count ?? 0, page };
	}
	async events(organizationId: string) {
		const { data, error } = await this.clients.admin
			.from('events')
			.select('id,title')
			.eq('organizer_id', organizationId)
			.order('title');
		if (error) throw error;
		return (data ?? []) as Array<{ id: string; title: string }>;
	}
	async mutate(userId: string, organizationId: string, operation: string, input: Record<string, unknown>) {
		const { data, error } = await this.clients.admin.rpc('iam_manage', {
			actor: userId,
			organization: organizationId,
			operation,
			input,
		});
		if (error) {
			await this.auditDeniedMutation(userId, organizationId, operation, error.message);
			iamDatabaseError(error);
		}
		return data as Record<string, unknown>;
	}
	async accept(userId: string, tokenHash: string) {
		const { data, error } = await this.clients.admin.rpc('iam_accept_invitation', {
			actor: userId,
			invitation_hash: tokenHash,
		});
		if (error) {
			await this.auditDeniedMutation(userId, null, 'invitations.accept', error.message);
			iamDatabaseError(error);
		}
		return data as { organizationId: string; memberId: string };
	}
	private async auditDeniedMutation(userId: string, organizationId: string | null, operation: string, reason: string) {
		if (
			![
				'IAM_PERMISSION_DENIED',
				'IAM_CANNOT_DELEGATE',
				'IAM_OWNER_PROTECTED',
				'IAM_INVITATION_IDENTITY',
				'IAM_MEMBER_SUSPENDED',
				'IAM_EVENT_SCOPE',
				'IAM_ROLE_SCOPE',
			].includes(reason)
		)
			return;
		const { error } = await this.clients.admin.from('audit_logs').insert({
			actor_id: userId,
			organization_id: organizationId,
			action: 'iam.access.denied',
			resource_type: 'iam',
			resource_id: organizationId,
			metadata: { operation, reason },
		});
		if (error) throw error;
	}
}
