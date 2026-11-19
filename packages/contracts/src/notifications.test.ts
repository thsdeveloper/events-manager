import { describe, expect, it } from 'vitest';
import {
	userEmailPreferencesSchema,
	organizationEmailPreferencesSchema,
	notificationCatalog,
} from './notifications.js';

describe('email notification preferences', () => {
	it('provides defaults for useful transactional updates without subscribing to marketing', () => {
		expect(userEmailPreferencesSchema.parse({})).toEqual({
			welcome: true,
			payment_updates: true,
			payment_reminders: true,
			event_updates: true,
			event_reminders: true,
			organization_notifications: true,
		});
		expect(organizationEmailPreferencesSchema.parse({})).toEqual({
			organization_updates: true,
			sales: true,
			refunds: true,
			payouts: true,
			receiving_account: true,
			event_publication: true,
		});
	});
	it('preserves explicit opt-outs and rejects unknown settings or coerced booleans', () => {
		expect(userEmailPreferencesSchema.parse({ event_reminders: false }).event_reminders).toBe(false);
		expect(userEmailPreferencesSchema.safeParse({ event_reminders: 'false' }).success).toBe(false);
		expect(userEmailPreferencesSchema.safeParse({ security: false }).success).toBe(false);
		expect(organizationEmailPreferencesSchema.safeParse({ recipient: 'other@example.test' }).success).toBe(false);
	});
	it('keeps refunds and event cancellation independent of optional preferences', () => {
		expect(notificationCatalog.purchase_refunded.preference).toBeNull();
		expect(notificationCatalog.event_cancelled.preference).toBeNull();
		expect(notificationCatalog.organization_sale.scope).toBe('organization');
	});
});
