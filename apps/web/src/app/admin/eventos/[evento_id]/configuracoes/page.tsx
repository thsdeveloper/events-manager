import { redirect } from 'next/navigation';

export default async function EventSettingsPage({ params }: { params: Promise<{ evento_id: string }> }) {
	const { evento_id: eventId } = await params;
	redirect(`/admin/eventos/${encodeURIComponent(eventId)}/editar`);
}
