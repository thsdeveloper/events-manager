import type { ReactNode } from 'react';
import { SuperAdminShell } from '@/features/super-admin/components/SuperAdminShell';
import { requireSuperAdmin } from '@/lib/auth/server-auth';

export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
  const auth = await requireSuperAdmin();

  return <SuperAdminShell user={auth.user} isOrganizer={auth.isOrganizer}>{children}</SuperAdminShell>;
}

