import { notFound } from 'next/navigation';
import type { Event, EventPageRecord } from '@events-manager/contracts';
import { EventPageBuilder } from '@/features/event-page/builder/EventPageBuilder';
import { authenticatedBackendFetch, BackendRequestError } from '@/lib/backend-auth';

interface PageProps {
	params: Promise<{ evento_id: string }>;
}

/** Construtor da landing page do evento: carrega o evento e o rascunho da página. */
export default async function PaginaDoEventoPage({ params }: PageProps) {
	const { evento_id } = await params;

	try {
		const [event, page] = await Promise.all([
			authenticatedBackendFetch<Event>(`/api/events/${evento_id}`),
			authenticatedBackendFetch<EventPageRecord>(`/api/events/${evento_id}/page`),
		]);
		if (!event || !page) notFound();

		return <EventPageBuilder event={event} initialPage={page} />;
	} catch (error) {
		if (error instanceof BackendRequestError && error.status === 404) notFound();
		throw error;
	}
}
