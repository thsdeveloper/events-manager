import { TeamManagement } from '@/features/iam/components/TeamManagement';
import { ServerPermissionGate } from '@/components/auth/ServerPermissionGate';
export default function TeamPage() {
	return (
		<ServerPermissionGate path="/admin/equipe">
			<TeamManagement />
		</ServerPermissionGate>
	);
}
