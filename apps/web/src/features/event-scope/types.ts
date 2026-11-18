export interface EventSelection {
	events: Array<{ id: string; title: string }>;
	selectedEventId: string | null;
}

export const allEventsSelection: EventSelection = { events: [], selectedEventId: null };
