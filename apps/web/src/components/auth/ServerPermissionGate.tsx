import type { ReactNode } from 'react';
import { getServerPermissions } from '@/lib/auth/server-permissions';
import { canVisitAdminPath } from '@/lib/auth/permission-policy';
import { AccessDenied } from './AccessDenied';
export async function ServerPermissionGate({ path, children }: { path: string; children: ReactNode }) {
	return canVisitAdminPath(await getServerPermissions(), path) ? children : <AccessDenied />;
}
