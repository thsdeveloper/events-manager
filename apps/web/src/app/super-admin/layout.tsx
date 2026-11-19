import { getPlatformPermissions } from '@/features/platform-access/server';
import { PlatformPermissionsProvider, PlatformBoundary } from '@/features/platform-access/PlatformPermissions';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { cookies } from 'next/headers';
import { ReactQueryProvider } from '@/contexts/ReactQueryProvider';
import type { ReactNode } from 'react';
import { SuperAdminShell } from '@/features/super-admin/components/SuperAdminShell';
import { requireSuperAdmin } from '@/lib/auth/server-auth';

export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
	const auth = await requireSuperAdmin();
	const access = await getPlatformPermissions();
	if (!access) return <AccessDenied scope="platform" />;

	return (
		<ReactQueryProvider key={auth.user.id}>
			<PlatformPermissionsProvider initialAccess={access}>
				<SuperAdminShell
					defaultOpen={(await cookies()).get('sidebar_state')?.value !== 'false'}
					user={auth.user}
					isOrganizer={auth.isOrganizer}
				>
					<PlatformBoundary>{children}</PlatformBoundary>
				</SuperAdminShell>
			</PlatformPermissionsProvider>
		</ReactQueryProvider>
	);
}
