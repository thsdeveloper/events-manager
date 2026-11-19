import { describe, expect, it, vi } from 'vitest';
import { userEmailPreferencesSchema, organizationEmailPreferencesSchema } from '@events-manager/contracts';
import {
	NotificationProcessor,
	shouldSendNotification,
	type NotificationJob,
	type NotificationRecipient,
	type NotificationQueue,
} from '../src/application/notifications/notification-processor.js';
const job: NotificationJob = {
	id: 'job',
	lease_token: 'lease',
	kind: 'organization_sale',
	user_id: 'user',
	organizer_id: 'org',
	payload: {},
	attempts: 1,
};
const recipient: NotificationRecipient = {
	email: 'owner@example.test',
	verified: true,
	active: true,
	eligible: true,
	userSettings: userEmailPreferencesSchema.parse({}),
	organizationSettings: organizationEmailPreferencesSchema.parse({}),
};
function setup(jobs = [job]) {
	const queue: NotificationQueue = {
		claim: vi.fn().mockResolvedValue(jobs),
		recipient: vi.fn().mockResolvedValue(recipient),
		finish: vi.fn().mockResolvedValue(undefined),
		schedule: vi.fn().mockResolvedValue(undefined),
	};
	const sender = { send: vi.fn().mockResolvedValue(undefined) };
	return { queue, sender, processor: new NotificationProcessor(queue, sender, () => new Date('2026-11-19T12:00:00Z')) };
}
describe('notification delivery', () => {
	it('requires both organization and owner preferences for organization messages', () => {
		expect(
			shouldSendNotification(job, {
				...recipient,
				organizationSettings: { ...recipient.organizationSettings!, sales: false },
			}),
		).toBe(false);
		expect(
			shouldSendNotification(job, {
				...recipient,
				userSettings: { ...recipient.userSettings, organization_notifications: false },
			}),
		).toBe(false);
	});
	it('never sends to unverified, inactive or no longer eligible recipients', () => {
		for (const update of [{ verified: false }, { active: false }, { eligible: false }, { email: null }])
			expect(shouldSendNotification(job, { ...recipient, ...update })).toBe(false);
	});
	it('honors personal opt-outs but preserves essential refunds', () => {
		const user = { ...recipient, userSettings: { ...recipient.userSettings, event_updates: false } };
		expect(shouldSendNotification({ ...job, kind: 'event_changed', organizer_id: null }, user)).toBe(false);
		expect(shouldSendNotification({ ...job, kind: 'purchase_refunded', organizer_id: null }, user)).toBe(true);
	});
	it('marks opt-outs suppressed without calling the sender', async () => {
		const { queue, sender, processor } = setup();
		vi.mocked(queue.recipient).mockResolvedValue({ ...recipient, verified: false });
		expect(await processor.run()).toEqual({ sent: 0, suppressed: 1, failed: 0 });
		expect(sender.send).not.toHaveBeenCalled();
		expect(queue.finish).toHaveBeenCalledWith(job, 'suppressed');
	});
	it('acknowledges successful deliveries only after sending and keeps the lease', async () => {
		const { queue, sender, processor } = setup();
		expect(await processor.run()).toEqual({ sent: 1, suppressed: 0, failed: 0 });
		expect(sender.send).toHaveBeenCalledWith(job, recipient);
		expect(queue.finish).toHaveBeenCalledWith(job, 'sent');
		expect(queue.claim).toHaveBeenCalledWith(10);
	});
	it('retries failures with backoff without recording personal payloads or stopping the batch', async () => {
		const second = { ...job, id: 'next' };
		const { queue, sender, processor } = setup([job, second]);
		sender.send.mockRejectedValueOnce(new Error('SMTP error with personal content'));
		expect(await processor.run()).toEqual({ sent: 1, suppressed: 0, failed: 1 });
		expect(queue.finish).toHaveBeenCalledWith(job, 'failed', '2026-11-19T12:01:00.000Z');
		expect(JSON.stringify(vi.mocked(queue.finish).mock.calls)).not.toContain('personal content');
	});
	it('does not allow overlapping polling runs in the same process', async () => {
		const { queue, processor } = setup([]);
		let release!: () => void;
		vi.mocked(queue.schedule).mockImplementationOnce(
			() =>
				new Promise<void>((resolve) => {
					release = resolve;
				}),
		);
		const first = processor.run();
		expect(await processor.run()).toEqual({ sent: 0, suppressed: 0, failed: 0 });
		release();
		await first;
		expect(queue.claim).toHaveBeenCalledTimes(1);
	});
});
