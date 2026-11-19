import { createHash, randomBytes } from 'node:crypto';
import {
	platformPermissionDefinitions,
	hasPlatformPermission,
	type PlatformAccess,
	type IamMember,
	type PlatformRole,
	type IamAssignment,
} from '@events-manager/contracts';
import { PlatformAuthorization, type PlatformAuthorizationRepository } from './platform-authorization.js';
import { deliverTeamInvitation, type InvitationMailer } from './team-service.js';
export interface PlatformTeamRepository extends PlatformAuthorizationRepository {
	members(): Promise<IamMember[]>;
	roles(): Promise<PlatformRole[]>;
	invitations(): Promise<unknown[]>;
	audit(page: number): Promise<unknown>;
	mutate(userId: string, operation: string, input: Record<string, unknown>): Promise<Record<string, unknown>>;
	accept(userId: string, hash: string): Promise<{ memberId: string }>;
}
export class PlatformTeamService {
	constructor(
		private readonly repository: PlatformTeamRepository,
		private readonly mailer: InvitationMailer,
		private readonly webUrl: string,
	) {}
	async read(userId: string, resource: 'members' | 'roles' | 'invitations' | 'permissions' | 'audit', page = 1) {
		const access = await new PlatformAuthorization(this.repository).require(userId, [
			resource === 'audit'
				? 'platform_audit.read'
				: resource === 'roles' || resource === 'permissions'
					? 'platform_roles.read'
					: 'platform_users.read',
		]);
		if (resource === 'permissions')
			return platformPermissionDefinitions.map((p) => ({ ...p, delegable: hasPlatformPermission(access, p.key) }));
		if (resource === 'audit') return this.repository.audit(page);
		return this.repository[resource]();
	}
	async invite(userId: string, input: { email: string; assignments: IamAssignment[] }) {
		return this.issue(userId, 'invitations.create', input);
	}
	async resend(userId: string, id: string) {
		return this.issue(userId, 'invitations.resend', { id });
	}
	private async issue(userId: string, operation: string, input: Record<string, unknown>) {
		const token = randomBytes(32).toString('base64url');
		const invitation = await this.repository.mutate(userId, operation, {
			...input,
			tokenHash: createHash('sha256').update(token).digest('hex'),
		});
		return deliverTeamInvitation(this.mailer, this.webUrl, invitation, token, '/convites/plataforma');
	}
	mutate(userId: string, operation: string, input: Record<string, unknown>) {
		return this.repository.mutate(userId, operation, input);
	}
	accept(userId: string, token: string) {
		return this.repository.accept(userId, createHash('sha256').update(token).digest('hex'));
	}
}
