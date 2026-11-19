import type {
	EmailPreferencesRepository,
	PreferenceScope,
	EmailPreferences,
} from '../../application/notifications/preferences.js';
import type { SupabaseClients } from './clients.js';
export class SupabaseNotificationPreferences implements EmailPreferencesRepository {
	constructor(private readonly clients: SupabaseClients) {}
	async read(scope: PreferenceScope, id: string) {
		const { data, error } = await this.clients.admin
			.from(scope === 'user' ? 'profiles' : 'organizers')
			.select('email_preferences')
			.eq('id', id)
			.single();
		if (error) throw error;
		return data?.email_preferences ?? {};
	}
	async write(scope: PreferenceScope, id: string, settings: EmailPreferences) {
		const { error } = await this.clients.admin
			.from(scope === 'user' ? 'profiles' : 'organizers')
			.update({ email_preferences: settings })
			.eq('id', id)
			.select('id')
			.single();
		if (error) throw error;
	}
}
