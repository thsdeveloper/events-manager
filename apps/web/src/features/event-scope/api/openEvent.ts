import { selectEvent } from './selectEvent';

export async function openEvent(
	router: { push(path: string): void; refresh(): void },
	eventId: string,
	selectedEventId: string | null,
) {
	if (selectedEventId && selectedEventId !== eventId) await selectEvent(eventId);
	router.push(`/admin/eventos/${eventId}`);
	router.refresh();
}
