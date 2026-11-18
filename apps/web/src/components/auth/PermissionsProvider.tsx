'use client';
import { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { hasPermission, hasAnyEventPermission, type IamAccess, type Permission } from '@events-manager/contracts';
import { canVisitAdminPath } from '@/lib/auth/permission-policy';
import { AccessDenied } from './AccessDenied';
export const PermissionContext = createContext<IamAccess | null>(null);
export function PermissionsProvider({
	initialAccess,
	organizationId,
	children,
}: {
	initialAccess: IamAccess | null;
	organizationId: string;
	children: ReactNode;
}) {
	const query = useQuery({
		queryKey: ['iam', initialAccess?.userId, organizationId, 'access'],
		queryFn: async ({ signal }) => {
			const response = await fetch('/api/organizer/iam/access', { credentials: 'include', cache: 'no-store', signal });
			if (!response.ok) throw new Error('Acesso indisponível');
			const data = (await response.json()) as IamAccess;
			if (data.organizationId !== organizationId) throw new Error('A organização ativa mudou. Atualize a página.');

			return data;
		},
		initialData: initialAccess ?? undefined,
		staleTime: 0,
		refetchInterval: 30000,
		refetchOnWindowFocus: true,
		retry: false,
	});

	return (
		<PermissionContext.Provider value={query.isError ? null : (query.data ?? null)}>
			{children}
		</PermissionContext.Provider>
	);
}
export function usePermissions() {
	const access = useContext(PermissionContext);

	return {
		access,
		can: (permission: Permission, eventId?: string | null) => hasPermission(access, permission, eventId),
		canAny: (permission: Permission) => hasAnyEventPermission(access, permission),
	};
}
export function PermissionBoundary({ children }: { children: ReactNode }) {
	const { access } = usePermissions();
	const path = usePathname();

	return canVisitAdminPath(access, path) ? children : <AccessDenied />;
}
export function Can({
	permission,
	eventId,
	anyEvent = false,
	children,
}: {
	permission: Permission;
	eventId?: string | null;
	anyEvent?: boolean;
	children: ReactNode;
}) {
	const { can, canAny } = usePermissions();

	return (anyEvent ? canAny(permission) : can(permission, eventId)) ? children : null;
}
