import { PageHeader } from '@/components/design-system/molecules/PageHeader';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { buildDefaultEventPageLayout, type Event, type EventPageRecord } from '@events-manager/contracts';
import { authenticatedBackendFetch, BackendRequestError } from '@/lib/backend-auth';
import { EventPageRenderer } from '@/features/event-page/puck/EventPageRenderer';

export const metadata: Metadata = { title: 'Prévia do evento', robots: { index: false, follow: false } };
export default async function EventPreviewPage({ params }: { params: Promise<{ evento_id: string }> }) {
	const { evento_id } = await params;
	try {
		const event = await authenticatedBackendFetch<Event>('/api/events/' + encodeURIComponent(evento_id));
		if (!event) notFound();
		const page = await authenticatedBackendFetch<EventPageRecord>(
			'/api/events/' + encodeURIComponent(evento_id) + '/page',
		);

		return (
			<div className="space-y-4">
				<PageHeader
					title="Prévia do evento"
					description="Somente você pode acessar esta prévia. A compra está desativada."
				/>
				<EventPageRenderer event={event} layout={page?.draft ?? buildDefaultEventPageLayout(event)} mode="preview" />
			</div>
		);
	} catch (error) {
		if (error instanceof BackendRequestError && error.status === 404) notFound();
		throw error;
	}
}
