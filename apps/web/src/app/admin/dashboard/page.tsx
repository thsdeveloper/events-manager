import type { OrganizerDashboard } from '@events-manager/contracts';
import { OrganizerDashboardTemplate } from '@/components/design-system/templates/OrganizerDashboardTemplate';
import { authenticatedBackendFetch } from '@/lib/backend-auth';

export default async function DashboardPage() {
	const dashboard = await authenticatedBackendFetch<OrganizerDashboard>('/api/admin/dashboard');

	return <OrganizerDashboardTemplate dashboard={dashboard} />;
}
