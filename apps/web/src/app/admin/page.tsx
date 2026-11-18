import { redirect } from 'next/navigation';
import { getServerPermissions } from '@/lib/auth/server-permissions';
import { preferredAdminPath } from '@/lib/auth/permission-policy';
export default async function AdminPage() {
	redirect(preferredAdminPath(await getServerPermissions()));
}
