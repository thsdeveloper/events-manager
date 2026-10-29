import { notFound } from 'next/navigation';
import type { Event } from '@events-manager/contracts';
import { authenticatedBackendFetch, BackendRequestError } from '@/lib/backend-auth';
import { EventCreationWizard } from '../../novo/_components/EventCreationWizard';

interface PageProps {
	params: Promise<{ evento_id: string }>;
}

/**
 * Editar usa o mesmo assistente em etapas da criação, partindo do evento
 * guardado. Uma tela diferente para editar deixava a pessoa perdida entre dois
 * formulários para o mesmo conteúdo.
 */
export default async function EditarEventoPage({ params }: PageProps) {
	const { evento_id } = await params;

	let event: Event;
	try {
		event = await authenticatedBackendFetch<Event>(`/api/events/${evento_id}`);
	} catch (error) {
		if (error instanceof BackendRequestError && error.status === 404) notFound();
		throw error;
	}
	if (!event) notFound();

	return (
		<div className="mx-auto -mt-2 space-y-6 pb-24 sm:-mt-4 lg:-mt-6">
			<EventCreationWizard mode="edit" event={event} />
		</div>
	);
}
