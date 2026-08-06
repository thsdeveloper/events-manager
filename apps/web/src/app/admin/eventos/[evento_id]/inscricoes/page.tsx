import { redirect } from 'next/navigation';

export default async function EventRegistrationsPage({ params }: { params: Promise<{ evento_id: string }> }) {
	const { evento_id: eventId } = await params;
	redirect(`/admin/participantes?eventId=${encodeURIComponent(eventId)}`);
}
