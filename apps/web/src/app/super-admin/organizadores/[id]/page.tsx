import { ReceivingReviewPanel, ManualPayoutPanel } from '@/features/receiving-accounts';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { fetchOrganizerSupport } from '@/features/super-admin/api/server';
import { OrganizerSupportPage } from '@/features/super-admin/components/OrganizerSupportPage';
import { BackendRequestError } from '@/lib/backend-auth';
export default async function OrganizerDetailPage({
	params,
	searchParams,
}: {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ tab?: string }>;
}) {
	const { id } = await params;
	const { tab } = await searchParams;
	const initialTab = ['overview', 'receiving', 'events', 'transactions', 'payouts', 'activity'].includes(tab ?? '')
		? tab
		: 'overview';
	if (!z.string().uuid().safeParse(id).success) notFound();
	try {
		return (
			<OrganizerSupportPage
				initialTab={initialTab}
				initialDetail={await fetchOrganizerSupport(id)}
				receivingPanel={<ReceivingReviewPanel organizerId={id} />}
				manualPayoutPanel={<ManualPayoutPanel organizerId={id} />}
			/>
		);
	} catch (error) {
		if (error instanceof BackendRequestError && error.status === 404) notFound();
		throw error;
	}
}
