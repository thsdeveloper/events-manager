import { PageHeader } from '@/components/design-system/molecules/PageHeader';
import { notFound, redirect } from 'next/navigation';
import { authenticatedBackendFetch, BackendRequestError } from '@/lib/backend-auth';
import { EventCreationWizard } from './_components/EventCreationWizard';
import type { EventWizardSnapshot } from './_components/types';

export default async function NovoEventoPage({
	searchParams,
}: {
	searchParams?: Promise<{ rascunho?: string | string[] }>;
}) {
	const query = searchParams ? await searchParams : {};
	const draftId = typeof query.rascunho === 'string' ? query.rascunho : undefined;
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
		if (initialDraft?.event_id) redirect('/admin/eventos/' + initialDraft.event_id);
	}

	return (
		<div className="w-full space-y-6 pb-24">
			<PageHeader title="Novo evento" description="Preencha as etapas para criar e publicar seu evento." />
			<EventCreationWizard initialDraft={initialDraft} />
		</div>
	);
}
