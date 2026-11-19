import { describe, expect, it, vi } from 'vitest';
import { SupabaseNotificationQueue } from '../src/infrastructure/supabase/notification-queue.js';
import { partialMock } from './support/index.js';
import type { SupabaseClients } from '../src/infrastructure/supabase/clients.js';
const job = {
	id: 'job',
	lease_token: 'token',
	kind: 'welcome' as const,
	user_id: 'buyer',
	organizer_id: null,
	payload: {},
	attempts: 1,
};
function setup(data: unknown, error: unknown = null) {
	const rpc = vi.fn().mockResolvedValue({ data, error });
	const queue = new SupabaseNotificationQueue(partialMock<SupabaseClients>({ admin: { rpc } }));
	return { queue, rpc };
}
describe('notification queue repository', () => {
	it('claims and validates leased jobs', async () => {
		const { queue, rpc } = setup([job]);
		expect(await queue.claim(10)).toEqual([job]);
		expect(rpc).toHaveBeenCalledWith('claim_email_notifications', { batch_size: 10 });
	});
	it('rejects unknown notification types rather than sending them', async () => {
		await expect(setup([{ ...job, kind: 'unexpected' }]).queue.claim(10)).rejects.toThrow();
	});
	it('resolves current consent, eligibility and sale totals', async () => {
		const { queue, rpc } = setup({
			email: 'buyer@example.test',
			verified: true,
			active: true,
			eligible: true,
			userSettings: { event_reminders: false },
			organizationSettings: { sales: false },
			details: { amount: 150 },
		});
		expect(await queue.recipient(job)).toMatchObject({
			userSettings: { event_reminders: false, payment_updates: true },
			organizationSettings: { sales: false, payouts: true },
			details: { amount: 150 },
		});
		expect(rpc).toHaveBeenCalledWith('email_notification_recipient', { job_id: 'job', token: 'token' });
	});
	it('treats missing or expired recipients as ineligible', async () => {
		expect(await setup({ eligible: false }).queue.recipient(job)).toMatchObject({
			email: null,
			verified: false,
			active: false,
			eligible: false,
		});
	});
	it('acknowledges only the current lease and persists retry scheduling', async () => {
		const { queue, rpc } = setup(true);
		await queue.finish(job, 'failed', '2026-11-19T13:00:00Z');
		expect(rpc).toHaveBeenCalledWith('finish_email_notification', {
			job_id: 'job',
			token: 'token',
			outcome: 'failed',
			retry_at: '2026-11-19T13:00:00Z',
		});
		await expect(setup(false).queue.finish(job, 'sent')).rejects.toThrow();
	});
	it('fails visibly when scheduling or claiming is unavailable', async () => {
		const { queue } = setup(null, new Error('unavailable'));
		await expect(queue.schedule()).rejects.toThrow();
		await expect(queue.claim(10)).rejects.toThrow();
		await expect(queue.recipient(job)).rejects.toThrow();
		await expect(queue.finish(job, 'sent')).rejects.toThrow();
	});
});
