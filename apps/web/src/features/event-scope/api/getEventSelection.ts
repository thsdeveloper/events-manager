import 'server-only';
import { cache } from 'react';
import { authenticatedBackendFetch, BackendRequestError } from '@/lib/backend-auth';
import { allEventsSelection, type EventSelection } from '../types';
export const getEventSelection = cache(async () => {
	try {
		return await authenticatedBackendFetch<EventSelection>('/api/organizer/event-selection');
	} catch (error) {
		if (error instanceof BackendRequestError && error.status === 403) return allEventsSelection;
		throw error;
	}
});
