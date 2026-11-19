import { canOpenPlatformPage } from '@/features/platform-access/server';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { TeamManagement } from '@/features/iam/components/TeamManagement';
import { PlatformTeamScope } from '@/features/platform-access/PlatformPermissions';
export default async function PlatformTeamPage() {
	if (!(await canOpenPlatformPage('/super-admin/equipe'))) return <AccessDenied scope="platform" />;

	return (
		<PlatformTeamScope>
			<TeamManagement />
		</PlatformTeamScope>
	);
}
