export async function selectEvent(eventId: string | null) {
	const response = await fetch('/api/organizer/event-selection', {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ eventId }),
	});
	if (!response.ok) {
		const problem = await response.json().catch(() => null);
		throw new Error(problem?.detail || 'Não foi possível trocar de evento. Tente novamente.');
	}
}
