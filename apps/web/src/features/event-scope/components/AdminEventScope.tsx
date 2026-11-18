'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { ReactQueryProvider } from '@/contexts/ReactQueryProvider';
import { allEventsSelection, type EventSelection } from '../types';

const EventScopeContext = createContext<EventSelection>(allEventsSelection);

export const useAdminEventScope = () => useContext(EventScopeContext);

export function AdminEventScope({
	children,
	selection,
	scopeKey,
}: {
	children: ReactNode;
	selection: EventSelection;
	scopeKey: string;
}) {
	return (
		<EventScopeContext.Provider value={selection}>
			<ReactQueryProvider key={`${scopeKey}:${selection.selectedEventId ?? 'all'}`}>{children}</ReactQueryProvider>
		</EventScopeContext.Provider>
	);
}
