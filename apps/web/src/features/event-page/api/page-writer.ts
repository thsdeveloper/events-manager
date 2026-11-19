import {
	eventPageLayoutSchema,
	validateEventPageLayout,
	type EventPageLayout,
	type EventPageRecord,
} from '@events-manager/contracts';
import { describeProblem } from '@/lib/problem';

async function requestPage(eventId: string, path: string, init: RequestInit): Promise<EventPageRecord> {
	const response = await fetch(`/api/events/${eventId}/page${path}`, { credentials: 'include', ...init });
	const body = await response.json().catch(() => null);
	if (!response.ok) throw Object.assign(new Error(describeProblem(body)), { problem: body });

	return body as EventPageRecord;
}

/** Serialize saves and publication so a slower autosave cannot publish an older draft. */
export function createPageWriter(eventId: string, initial: EventPageRecord) {
	let record = initial;
	let savedKey = initial.date_updated ? JSON.stringify(eventPageLayoutSchema.parse(initial.draft)) : '';
	let queue: Promise<unknown> = Promise.resolve();
	const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
		const job = queue.then(operation);
		queue = job.catch(() => undefined);

		return job;
	};
	const persist = async (snapshot: EventPageLayout) => {
		const key = JSON.stringify(snapshot);
		if (savedKey === key) return record;
		const updated = await requestPage(eventId, '', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ draft: snapshot }),
		});
		record = updated;
		savedKey = key;

		return record;
	};

	return {
		async save(layout: EventPageLayout) {
			const snapshot = eventPageLayoutSchema.parse(layout);

			return enqueue(() => persist(snapshot));
		},
		async publish(layout: EventPageLayout) {
			const snapshot = eventPageLayoutSchema.parse(layout);
			const issues = validateEventPageLayout(snapshot);
			if (issues.length)
				throw Object.assign(new Error('Resolva os problemas da página antes de publicar.'), {
					problem: { context: { issues } },
				});

			return enqueue(async () => {
				await persist(snapshot);
				record = await requestPage(eventId, '/publish', { method: 'POST' });

				return record;
			});
		},
		unpublish: () =>
			enqueue(async () => {
				record = await requestPage(eventId, '/unpublish', { method: 'POST' });

				return record;
			}),
	};
}
