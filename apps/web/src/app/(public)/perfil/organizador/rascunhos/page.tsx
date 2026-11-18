import { notFound, redirect } from 'next/navigation';
import Container from '@/components/ui/container';
import { ReactQueryProvider } from '@/contexts/ReactQueryProvider';
import { requireAuth } from '@/lib/auth/server-auth';
import { authenticatedBackendFetch, BackendRequestError } from '@/lib/backend-auth';
import { EventDraftList } from '@/app/admin/eventos/_components/EventDraftList';
import { EventCreationWizard } from '@/app/admin/eventos/novo/_components/EventCreationWizard';
import type { EventWizardSnapshot } from '@/app/admin/eventos/novo/_components/types';

export const metadata = { title: 'Preparar evento em rascunho', robots: { index: false, follow: false } };
export default async function OrganizerDraftsPage({
	searchParams,
}: {
	searchParams?: Promise<{ rascunho?: string | string[] }>;
}) {
	const auth = await requireAuth('/perfil/organizador/rascunhos');
	const query = searchParams ? await searchParams : {};
	const draftId = typeof query.rascunho === 'string' ? query.rascunho : undefined;
	if (auth.isOrganizer && auth.organizerStatus === 'active')
		redirect('/admin/eventos/novo' + (draftId ? '?rascunho=' + encodeURIComponent(draftId) : ''));
	if (auth.organizerStatus !== 'pending' && !auth.hasPendingOrganizerRequest) redirect('/perfil/organizador');
	let initialDraft: EventWizardSnapshot | undefined;
	if (draftId) {
		if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(draftId)) notFound();
		try {
			initialDraft = await authenticatedBackendFetch<EventWizardSnapshot>(
				'/api/event-drafts/' + encodeURIComponent(draftId),
			);
		} catch (error) {
			if (error instanceof BackendRequestError && error.status === 404) notFound();
			throw error;
		}
		if (initialDraft?.event_id) notFound();
	}

	return (
		<Container as="section" className="space-y-6 py-8 pb-24">
			<ReactQueryProvider>
				<EventDraftList enabled resumePath="/perfil/organizador/rascunhos" />
				<EventCreationWizard draftOnly initialDraft={initialDraft} />
			</ReactQueryProvider>
		</Container>
	);
}
