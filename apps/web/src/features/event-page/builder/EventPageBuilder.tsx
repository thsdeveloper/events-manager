'use client';
import dynamic from 'next/dynamic';
import type { Event, EventPageRecord } from '@events-manager/contracts';
export interface EventPageBuilderProps {
	event: Event;
	initialPage: EventPageRecord;
	autosaveDelayMs?: number;
}
const Editor = dynamic(() => import('./PuckEventPageEditor').then((module) => module.PuckEventPageEditor), {
	ssr: false,
	loading: () => (
		<div
			role="status"
			className="flex min-h-96 items-center justify-center rounded-xl border bg-card text-muted-foreground"
		>
			Preparando seu editor de página…
		</div>
	),
});
export function EventPageBuilder(props: EventPageBuilderProps) {
	return <Editor key={props.event.id} {...props} />;
}
