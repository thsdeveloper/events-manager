import { cookies } from 'next/headers';
import { ReactQueryProvider } from '@/contexts/ReactQueryProvider';
import type { ReactNode } from 'react';
import { SuperAdminShell } from '@/features/super-admin/components/SuperAdminShell';
import { requireSuperAdmin } from '@/lib/auth/server-auth';

export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
	const auth = await requireSuperAdmin();

	return (
		<ReactQueryProvider key={auth.user.id}>
			<SuperAdminShell
				defaultOpen={(await cookies()).get('sidebar_state')?.value !== 'false'}
				user={auth.user}
				isOrganizer={auth.isOrganizer}
			>
				{children}
			</SuperAdminShell>
		</ReactQueryProvider>
	);
}
