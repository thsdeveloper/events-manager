import 'server-only';
import { cache } from 'react';
import type { IamAccess } from '@events-manager/contracts';
import { authenticatedBackendFetch, BackendRequestError } from '@/lib/backend-auth';
export const getServerPermissions = cache(async (): Promise<IamAccess | null> => {
	try {
		return await authenticatedBackendFetch<IamAccess>('/api/organizer/iam/access');
	} catch (error) {
		if (error instanceof BackendRequestError && (error.status === 401 || error.status === 403)) return null;
		throw error;
	}
});
