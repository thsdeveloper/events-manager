import { hasPlatformPermission, type PlatformAccess, type PlatformPermission } from '@events-manager/contracts';
import { ApiError } from '../../shared/errors.js';
export interface PlatformAuthorizationRepository {
	access(userId: string): Promise<PlatformAccess>;
	denied(userId: string, action: string): Promise<void>;
}
export class PlatformAuthorization {
	constructor(private readonly repository: PlatformAuthorizationRepository) {}
	async require(userId: string, actions: PlatformPermission[] = []) {
		const access = await this.repository.access(userId);
		const missing = actions.find((p) => !hasPlatformPermission(access, p));
		if (!access?.active || missing) {
			await this.repository.denied(userId, missing ?? 'platform.access');
			throw new ApiError(
				'Você não tem permissão para acessar esta área da plataforma.',
				403,
				'PLATFORM_PERMISSION_DENIED',
			);
		}
		return access;
	}
}
