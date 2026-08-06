import { notFound } from 'next/navigation';
import { Event } from '@events-manager/contracts';
import { authenticatedBackendFetch, BackendRequestError } from '@/lib/backend-auth';
import EventoDetalhesClient from './EventoDetalhesClient';

interface PageProps {
	params: Promise<{ evento_id: string }>;
}

export default async function EventoDetalhesPage({ params }: PageProps) {
	// Resolve params (Next.js 15 async params)
	const { evento_id } = await params;

	try {
		const event = await authenticatedBackendFetch<Event>(`/api/events/${evento_id}`);

		if (!event) {
			notFound();
		}

		// Pass server-fetched data to client component
		return <EventoDetalhesClient initialEvent={event} evento_id={evento_id} />;
	} catch (error) {
		if (error instanceof BackendRequestError && error.status === 404) notFound();
		throw error;
	}
}
