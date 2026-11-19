import { ApiError } from '../../shared/errors.js';
import type { PlatformAccess, PlatformRole, IamMember } from '@events-manager/contracts';
import type { SupabaseClients } from './clients.js';
import { iamDatabaseError } from './iam-repository.js';
import type { PlatformTeamRepository } from '../../application/iam/platform-team-service.js';
function platformDatabaseError(error: { message: string; code?: string }): never {
	const messages: Record<string, [number, string]> = {
		IAM_OWNER_PROTECTED: [409, 'O super-admin principal é protegido e não pode ser alterado pela equipe.'],
		IAM_MEMBER_SUSPENDED: [403, 'Seu acesso à plataforma está suspenso. Fale com o responsável pela equipe.'],
		IAM_EVENT_SCOPE: [422, 'A equipe da plataforma não utiliza escopo de evento.'],
	};
	const problem = messages[error.message];
	if (problem) throw new ApiError(problem[1], problem[0], error.message);
	return iamDatabaseError(error);
}
export class SupabasePlatformIamRepository implements PlatformTeamRepository {
	constructor(private readonly clients: SupabaseClients) {}
	async access(userId: string): Promise<PlatformAccess> {
		const { data, error } = await this.clients.admin.rpc('platform_access_context', { actor: userId });
		if (error) platformDatabaseError(error);
		return data as PlatformAccess;
	}
	async denied(userId: string, action: string) {
		const { error } = await this.clients.admin.from('audit_logs').insert({
			actor_id: userId,
			action: 'platform_iam.access.denied',
			resource_type: 'platform_permission',
			resource_id: null,
			metadata: { permission: action },
		});
		if (error) throw error;
	}
	async members(): Promise<IamMember[]> {
		const [members, roots] = await Promise.all([
			this.clients.admin
				.from('platform_members')
				.select(
					'id,user_id,status,created_at,profile:profiles(first_name,last_name,email,role),assignments:platform_role_assignments(role_id)',
				)
				.order('created_at'),
			this.clients.admin
				.from('profiles')
				.select('id,email,first_name,last_name,status,date_created')
				.eq('role', 'super_admin'),
		]);
		if (members.error) throw members.error;
		if (roots.error) throw roots.error;
		type Profile = {
			id: string;
			email: string;
			first_name: string;
			last_name: string;
			status: string;
			date_created: string;
			role?: string;
		};
		const name = (p: Partial<Profile>) => [p.first_name, p.last_name].filter(Boolean).join(' ');
		return [
			...(roots.data ?? []).map((p) => ({
				id: p.id,
				user_id: p.id,
				name: name(p),
				email: p.email ?? '',
				status: p.status === 'active' ? ('active' as const) : ('suspended' as const),
				created_at: p.date_created,
				isOwner: true,
				assignments: [{ roleId: '10000000-0000-4000-8000-000000000001', eventId: null }],
			})),
			...(members.data ?? [])
				.filter((m) => (m.profile as unknown as Profile)?.role !== 'super_admin')
				.map((m) => {
					const p = m.profile as unknown as Profile;
					return {
						id: m.id,
						user_id: m.user_id,
						name: name(p ?? {}),
						email: p?.email ?? '',
						status: m.status as IamMember['status'],
						created_at: m.created_at,
						isOwner: false,
						assignments: (m.assignments as unknown as Array<{ role_id: string }>).map((a) => ({
							roleId: a.role_id,
							eventId: null,
						})),
					};
				}),
		];
	}
	async roles(): Promise<PlatformRole[]> {
		const { data, error } = await this.clients.admin
			.from('platform_roles')
			.select('id,key,name,description,permissions:platform_role_permissions(permission)')
			.order('name');
		if (error) throw error;
		return (data ?? []).map((r) => ({
			...r,
			organization_id: null,
			permissions: (r.permissions as unknown as Array<{ permission: PlatformRole['permissions'][number] }>).map(
				(p) => p.permission,
			),
		}));
	}
	async invitations() {
		const { data, error } = await this.clients.admin
			.from('platform_invitations')
			.select('id,email,status,expires_at,created_at,assignments')
			.order('created_at', { ascending: false })
			.limit(200);
		if (error) throw error;
		return data ?? [];
	}
	async audit(page: number) {
		const { data, error, count } = await this.clients.admin
			.from('audit_logs')
			.select('id,actor_id,action,resource_type,resource_id,before_data,after_data,metadata,date_created', {
				count: 'exact',
			})
			.like('action', 'platform_iam.%')
			.order('date_created', { ascending: false })
			.range((page - 1) * 25, page * 25 - 1);
		if (error) throw error;
		return { data: data ?? [], total: count ?? 0, page };
	}
	async mutate(userId: string, operation: string, input: Record<string, unknown>) {
		const { data, error } = await this.clients.admin.rpc('platform_manage', { actor: userId, operation, input });
		if (error) {
			await this.denied(userId, operation);
			platformDatabaseError(error);
		}
		return data as Record<string, unknown>;
	}
	async accept(userId: string, hash: string) {
		const { data, error } = await this.clients.admin.rpc('platform_accept_invitation', {
			actor: userId,
			invitation_hash: hash,
		});
		if (error) {
			await this.denied(userId, 'invitations.accept');
			platformDatabaseError(error);
		}
		return data as { memberId: string };
	}
}
