import 'server-only';
import { cache } from 'react';
import { authenticatedBackendFetch } from '@/lib/backend-auth';
import type { EventSelection } from '../types';

export const getEventSelection = cache(() =>
	authenticatedBackendFetch<EventSelection>('/api/organizer/event-selection'),
);
