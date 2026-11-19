import {
	userEmailPreferencesSchema,
	organizationEmailPreferencesSchema,
	type UserEmailPreferences,
	type OrganizationEmailPreferences,
} from '@events-manager/contracts';
export type PreferenceScope = 'user' | 'organization';
export type EmailPreferences = UserEmailPreferences | OrganizationEmailPreferences;
export interface EmailPreferencesRepository {
	read(scope: PreferenceScope, id: string): Promise<unknown>;
	write(scope: PreferenceScope, id: string, settings: EmailPreferences): Promise<void>;
}
export class EmailNotificationPreferences {
	constructor(private readonly repository: EmailPreferencesRepository) {}
	async get(scope: PreferenceScope, id: string) {
		const schema = scope === 'user' ? userEmailPreferencesSchema : organizationEmailPreferencesSchema;
		return { settings: schema.parse((await this.repository.read(scope, id)) ?? {}) };
	}
	async save(scope: PreferenceScope, id: string, input: unknown) {
		const schema = scope === 'user' ? userEmailPreferencesSchema : organizationEmailPreferencesSchema;
		const settings = schema.parse(input);
		await this.repository.write(scope, id, settings);
		return { settings };
	}
}
