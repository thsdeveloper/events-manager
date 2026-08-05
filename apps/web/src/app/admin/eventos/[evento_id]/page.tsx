import { notFound, redirect } from 'next/navigation';
import { Event } from '@events-manager/contracts';
import { authenticatedBackendFetch } from '@/lib/backend-auth';
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
	} catch (error: any) {
		console.error('Error fetching event:', error);

		// If event not found or access denied
		if (error?.message?.includes('404')) {
			notFound();
		}

		// For other errors, redirect to events list
		redirect('/admin/eventos');
	}
}
