import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { AuthorizationService } from './authorization-service.js';
import { hasPermission, permissionDefinitions } from '@events-manager/contracts';
import type { IamAssignment, IamInvitation, IamMember, IamRole, IamRoleInput } from '@events-manager/contracts';
import type { AuthorizationRepository } from './authorization-service.js';
export interface TeamRepository extends AuthorizationRepository {
	members(organizationId: string): Promise<IamMember[]>;
	roles(organizationId: string): Promise<IamRole[]>;
	invitations(organizationId: string): Promise<IamInvitation[]>;
	audit(organizationId: string, page: number): Promise<unknown>;
	events(organizationId: string): Promise<Array<{ id: string; title: string }>>;
	mutate(
		userId: string,
		organizationId: string,
		operation: string,
		input: Record<string, unknown>,
	): Promise<Record<string, unknown>>;
	accept(userId: string, tokenHash: string): Promise<{ organizationId: string; memberId: string }>;
}
export interface InvitationMailer {
	send(input: { id: string; email: string; url: string; expiresAt: string }, deliveryKey: string): Promise<unknown>;
}
export class TeamService {
	constructor(
		private readonly repository: TeamRepository,
		private readonly mailer: InvitationMailer,
		private readonly webUrl: string,
	) {}
	async invite(userId: string, organizationId: string, input: { email: string; assignments: IamAssignment[] }) {
		const token = randomBytes(32).toString('base64url');
		const invitation = await this.repository.mutate(userId, organizationId, 'invitations.create', {
			...input,
			tokenHash: createHash('sha256').update(token).digest('hex'),
		});
		return deliverTeamInvitation(this.mailer, this.webUrl, invitation, token);
	}
	async resend(userId: string, organizationId: string, id: string) {
		const token = randomBytes(32).toString('base64url');
		const invitation = await this.repository.mutate(userId, organizationId, 'invitations.resend', {
			id,
			tokenHash: createHash('sha256').update(token).digest('hex'),
		});
		return deliverTeamInvitation(this.mailer, this.webUrl, invitation, token);
	}

	async members(userId: string, organizationId: string) {
		await new AuthorizationService(this.repository).require(userId, organizationId, 'users.read');
		return this.repository.members(organizationId);
	}
	async invitations(userId: string, organizationId: string) {
		await new AuthorizationService(this.repository).require(userId, organizationId, 'users.read');
		return this.repository.invitations(organizationId);
	}
	async roles(userId: string, organizationId: string) {
		await new AuthorizationService(this.repository).require(userId, organizationId, 'roles.read');
		return this.repository.roles(organizationId);
	}
	async audit(userId: string, organizationId: string, page: number) {
		await new AuthorizationService(this.repository).require(userId, organizationId, 'audit.read');
		return this.repository.audit(organizationId, page);
	}
	async permissions(userId: string, organizationId: string) {
		const access = await new AuthorizationService(this.repository).require(userId, organizationId, 'roles.read');
		return permissionDefinitions.map((p) => ({ ...p, delegable: hasPermission(access, p.key) }));
	}
	async events(userId: string, organizationId: string) {
		const { eventIds } = await new AuthorizationService(this.repository).requireList(userId, organizationId, [
			'events.read',
		]);
		return (await this.repository.events(organizationId)).filter((e) => eventIds === null || eventIds.includes(e.id));
	}
	mutate(userId: string, organizationId: string, operation: string, input: Record<string, unknown>) {
		return this.repository.mutate(userId, organizationId, operation, input);
	}
	async accept(userId: string, token: string) {
		return this.repository.accept(userId, createHash('sha256').update(token).digest('hex'));
	}
}

export async function deliverTeamInvitation(
	mailer: InvitationMailer,
	webUrl: string,
	invitation: Record<string, unknown>,
	token: string,
	path = '/convites/aceitar',
) {
	const url = new URL(path, webUrl);
	url.hash = new URLSearchParams({ token }).toString();
	try {
		await mailer.send(
			{
				id: String(invitation.id),
				email: String(invitation.email),
				expiresAt: String(invitation.expires_at),
				url: url.toString(),
			},
			`iam-invite:${invitation.id}:${randomUUID()}`,
		);
		return { invitation, delivery: 'sent' as const };
	} catch {
		return { invitation, delivery: 'failed' as const };
	}
}
