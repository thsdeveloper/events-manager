import {
	organizationEmailPreferencesSchema,
	userEmailPreferencesSchema,
	type EmailPreferencesResponse,
} from '@events-manager/contracts';
import { apiFetch } from '@/lib/http';
export type PreferenceScope = 'user' | 'organization';
export type EmailSettings = EmailPreferencesResponse['settings'];
export const preferenceKey = (scope: PreferenceScope, accountId: string) =>
	['email-notifications', scope, accountId] as const;
export async function readPreferences(scope: PreferenceScope, signal: AbortSignal): Promise<EmailSettings> {
	const result = await apiFetch<EmailPreferencesResponse>(endpoint(scope), { signal, cache: 'no-store' });

	return parsePreferences(scope, result.settings);
}
export async function savePreferences(scope: PreferenceScope, settings: EmailSettings): Promise<EmailSettings> {
	const result = await apiFetch<EmailPreferencesResponse>(endpoint(scope), { method: 'PUT', body: settings });

	return parsePreferences(scope, result.settings);
}
function endpoint(scope: PreferenceScope) {
	return `/api/${scope === 'user' ? 'user' : 'organizer'}/notification-preferences`;
}
function parsePreferences(scope: PreferenceScope, settings: unknown): EmailSettings {
	return (scope === 'user' ? userEmailPreferencesSchema : organizationEmailPreferencesSchema).parse(settings);
}
