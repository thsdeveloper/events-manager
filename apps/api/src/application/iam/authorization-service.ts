import { hasPermission, hasAnyEventPermission, type IamAccess, type Permission } from '@events-manager/contracts';
import { ApiError } from '../../shared/errors.js';
export interface AuthorizationRepository {
	access(userId: string, organizationId: string): Promise<IamAccess>;
	eventOrganization(eventId: string): Promise<string | null>;
	recordDenied(input: { userId: string; organizationId: string; action: Permission; eventId?: string }): Promise<void>;
}
export class AuthorizationService {
	constructor(private readonly repository: AuthorizationRepository) {}
	async context(userId: string, organizationId: string) {
		const access = await this.repository.access(userId, organizationId);
		if (!access || access.userId !== userId || access.organizationId !== organizationId) return null;
		return access;
	}
	async require(userId: string, organizationId: string, action: Permission, eventId?: string) {
		const access = await this.context(userId, organizationId);
		if (eventId && (await this.repository.eventOrganization(eventId)) !== organizationId) {
			await this.repository.recordDenied({ userId, organizationId, action, eventId });
			throw new ApiError('Recurso não encontrado.', 404, 'RESOURCE_NOT_FOUND');
		}
		if (!hasPermission(access, action, eventId)) {
			await this.repository.recordDenied({ userId, organizationId, action, eventId });
			throw new ApiError('Você não tem permissão para realizar esta ação.', 403, 'PERMISSION_DENIED', {
				permission: action,
			});
		}
		return access!;
	}
	async requireList(userId: string, organizationId: string, actions: Permission[]) {
		const access = await this.context(userId, organizationId);
		for (const action of actions) {
			if (!hasAnyEventPermission(access, action)) {
				await this.repository.recordDenied({ userId, organizationId, action });
				throw new ApiError('Você não tem acesso a este módulo.', 403, 'PERMISSION_DENIED', { permission: action });
			}
		}
		const eventIds = actions.every((a) => hasPermission(access, a))
			? null
			: access!.events
					.filter((event) => actions.every((a) => hasPermission(access, a, event.eventId)))
					.map((e) => e.eventId);
		if (eventIds && !eventIds.length) throw new ApiError('Nenhum evento autorizado.', 403, 'PERMISSION_DENIED');
		return { access: access!, eventIds };
	}
	async can(input: { userId: string; action: Permission; resource: { organizationId: string; eventId?: string } }) {
		const { userId, action, resource } = input;
		if (resource.eventId && (await this.repository.eventOrganization(resource.eventId)) !== resource.organizationId)
			return false;
		return hasPermission(await this.context(userId, resource.organizationId), action, resource.eventId);
	}
}
