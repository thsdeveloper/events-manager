import type { ReactNode } from 'react';
import { SuperAdminShell } from '@/features/super-admin/components/SuperAdminShell';
import { requireSuperAdmin } from '@/lib/auth/server-auth';

export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
  const auth = await requireSuperAdmin();
  const name = [auth.user.first_name, auth.user.last_name].filter(Boolean).join(' ') || auth.user.email;

  return <SuperAdminShell userName={name} canOpenOrganizer={auth.isOrganizer}>{children}</SuperAdminShell>;
}

