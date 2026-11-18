import type { ReceivingAccountOverview } from '@events-manager/contracts';
import { ReceivingAccountPage } from '@/features/receiving-accounts';
import { authenticatedBackendFetch } from '@/lib/backend-auth';
import { requireOrganizer } from '@/lib/auth/server-auth';
export default async function ReceivingPage() {
	const { organizer } = await requireOrganizer();
	const data = await authenticatedBackendFetch<ReceivingAccountOverview>(
		`/api/organizer/receiving-accounts/${organizer.id}`,
	);

	return <ReceivingAccountPage key={organizer.id} initialData={data} />;
}
