import { sanitizeHtml } from '@events-manager/contracts';
const descriptionFields = ['description', 'description_en', 'description_es'] as const;
/** Rich descriptions are sanitized for both incomplete snapshots and final events. */
export function sanitizeEventDescriptions<T extends object>(input: T): T {
	const clean = { ...input } as Record<string, unknown>;
	for (const field of descriptionFields) {
		const value = (input as Record<string, unknown>)[field];
		if (typeof value === 'string') clean[field] = sanitizeHtml(value);
	}
	return clean as T;
}
