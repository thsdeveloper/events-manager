'use client';
import { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { hasPlatformPermission, platformPermissionDefinitions, type PlatformAccess } from '@events-manager/contracts';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { TeamRuntimeContext, type TeamRuntime } from '@/features/iam/api/team-runtime';
import { canVisitPlatformPath } from './policy';
export const PlatformPermissionContext = createContext<PlatformAccess | null>(null);
export function usePlatformPermissions() {
	const access = useContext(PlatformPermissionContext);

	return { access, can: (p: string) => hasPlatformPermission(access, p) };
}
export function PlatformPermissionsProvider({
	initialAccess,
	children,
}: {
	initialAccess: PlatformAccess;
	children: ReactNode;
}) {
	const query = useQuery({
		queryKey: ['iam', initialAccess.userId, 'platform', 'access'],
		initialData: initialAccess,
		queryFn: async ({ signal }) => {
			const r = await fetch('/api/super-admin/iam/access', { credentials: 'include', cache: 'no-store', signal });
			if (!r.ok) throw new Error('Acesso à plataforma indisponível.');
			const data = (await r.json()) as PlatformAccess;
			if (data.userId !== initialAccess.userId) throw new Error('A sessão mudou. Atualize a página.');

			return data;
		},
		staleTime: 0,
		retry: false,
		refetchInterval: 30000,
		refetchOnWindowFocus: true,
	});
	const access = query.isError ? null : query.data;

	return <PlatformPermissionContext.Provider value={access}>{children}</PlatformPermissionContext.Provider>;
}
export function PlatformTeamScope({ children }: { children: ReactNode }) {
	const { access, can } = usePlatformPermissions();
	const runtime: TeamRuntime = {
		scope: 'platform',
		userId: access?.userId,
		contextId: 'platform',
		active: Boolean(access?.active),
		apiBase: '/api/super-admin/iam',
		definitions: platformPermissionDefinitions,
		can: (p) => can(p.startsWith('platform_') ? p : `platform_${p}`),
		canAny: () => false,
		canDelegate: (role, eventId) =>
			!eventId && role.key !== 'owner' && role.permissions.length > 0 && role.permissions.every(can),
	};

	return <TeamRuntimeContext.Provider value={runtime}>{children}</TeamRuntimeContext.Provider>;
}
export function PlatformBoundary({ children }: { children: ReactNode }) {
	const { access } = usePlatformPermissions();
	const path = usePathname();

	return canVisitPlatformPath(access, path) ? children : <AccessDenied scope="platform" />;
}
export function PlatformCan({ permission, children }: { permission: string; children: ReactNode }) {
	const { can } = usePlatformPermissions();

	return can(permission) ? children : null;
}
/** Keep read-only values available while disabling native form controls. API checks remain authoritative. */
export function PlatformWrite({ permission, children }: { permission: string; children: ReactNode }) {
	const { can } = usePlatformPermissions();

	return (
		<fieldset disabled={!can(permission)} className="min-w-0 space-y-4">
			{!can(permission) && (
				<p className="text-sm text-muted-foreground">Seu acesso a estas informações é somente para consulta.</p>
			)}
			{children}
		</fieldset>
	);
}
