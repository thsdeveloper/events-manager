import 'server-only';
import { cache } from 'react';
import type { PlatformAccess } from '@events-manager/contracts';
import { authenticatedBackendFetch, BackendRequestError } from '@/lib/backend-auth';
import { canVisitPlatformPath } from './policy';
export const getPlatformPermissions = cache(async (): Promise<PlatformAccess | null> => {
	try {
		return await authenticatedBackendFetch<PlatformAccess>('/api/super-admin/iam/access');
	} catch (error) {
		if (error instanceof BackendRequestError && [401, 403].includes(error.status)) return null;
		throw error;
	}
});
export async function canOpenPlatformPage(path: string) {
	return canVisitPlatformPath(await getPlatformPermissions(), path);
}
