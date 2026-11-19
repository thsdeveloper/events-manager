import { describe, expect, it, vi } from 'vitest';
import {
	EmailNotificationPreferences,
	type EmailPreferencesRepository,
} from '../src/application/notifications/preferences.js';
function setup() {
	const repository: EmailPreferencesRepository = {
		read: vi.fn().mockResolvedValue({}),
		write: vi.fn().mockResolvedValue(undefined),
	};
	return { repository, service: new EmailNotificationPreferences(repository) };
}
describe('email preferences', () => {
	it('fills unset options while preserving stored opt-outs', async () => {
		const { repository, service } = setup();
		vi.mocked(repository.read).mockResolvedValue({ sales: false });
		expect(await service.get('organization', 'org')).toMatchObject({ settings: { sales: false, refunds: true } });
	});
	it('writes only validated settings for the authenticated scope', async () => {
		const { repository, service } = setup();
		await service.save('user', 'user-id', { event_reminders: false });
		expect(repository.write).toHaveBeenCalledWith(
			'user',
			'user-id',
			expect.objectContaining({ event_reminders: false }),
		);
	});
	it('rejects recipient and cross-scope changes before persistence', async () => {
		const { repository, service } = setup();
		await expect(service.save('user', 'user-id', { user_id: 'other', sales: false })).rejects.toThrow();
		await expect(service.save('organization', 'org', { recipient: 'other@example.test' })).rejects.toThrow();
		expect(repository.write).not.toHaveBeenCalled();
	});
});
