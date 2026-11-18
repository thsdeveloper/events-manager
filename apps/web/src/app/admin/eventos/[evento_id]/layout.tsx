import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getEventSelection } from '@/features/event-scope/api/getEventSelection';

export default async function EventLayout({
	children,
	params,
}: {
	children: ReactNode;
	params: Promise<{ evento_id: string }>;
}) {
	const [{ evento_id }, { selectedEventId }] = await Promise.all([params, getEventSelection()]);
	if (selectedEventId && selectedEventId !== evento_id) redirect(`/admin/eventos/${selectedEventId}`);

	return children;
}
