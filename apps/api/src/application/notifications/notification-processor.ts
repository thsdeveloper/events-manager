import {
	notificationCatalog,
	type NotificationKind,
	type UserEmailPreferences,
	type OrganizationEmailPreferences,
} from '@events-manager/contracts';
export const NOTIFICATION_BATCH_SIZE = 10;
export interface NotificationJob {
	id: string;
	lease_token: string;
	kind: NotificationKind;
	user_id: string;
	organizer_id: string | null;
	payload: Record<string, unknown>;
	attempts: number;
}
export interface NotificationRecipient {
	email: string | null;
	verified: boolean;
	active: boolean;
	eligible: boolean;
	userSettings: UserEmailPreferences;
	organizationSettings: OrganizationEmailPreferences | null;
	details?: Record<string, unknown>;
}
export interface NotificationQueue {
	claim(limit: number): Promise<NotificationJob[]>;
	recipient(job: NotificationJob): Promise<NotificationRecipient>;
	finish(job: NotificationJob, status: 'sent' | 'suppressed' | 'failed', retryAt?: string): Promise<void>;
	schedule(): Promise<void>;
}
export interface NotificationSender {
	send(job: NotificationJob, recipient: NotificationRecipient): Promise<void>;
}
export function shouldSendNotification(job: NotificationJob, recipient: NotificationRecipient): boolean {
	if (!recipient.email || !recipient.verified || !recipient.active || !recipient.eligible) return false;
	const definition = notificationCatalog[job.kind];
	if (!definition) return false;
	if (definition.scope === 'organization')
		return Boolean(
			recipient.userSettings.organization_notifications && recipient.organizationSettings?.[definition.preference],
		);
	return definition.preference === null || recipient.userSettings[definition.preference];
}
export class NotificationProcessor {
	private running = false;
	constructor(
		private readonly queue: NotificationQueue,
		private readonly sender: NotificationSender,
		private readonly now = () => new Date(),
	) {}
	async run() {
		const result = { sent: 0, suppressed: 0, failed: 0 };
		if (this.running) return result;
		this.running = true;
		try {
			await this.queue.schedule();
			const jobs = await this.queue.claim(NOTIFICATION_BATCH_SIZE);
			for (const job of jobs) {
				try {
					const recipient = await this.queue.recipient(job);
					if (!shouldSendNotification(job, recipient)) {
						await this.queue.finish(job, 'suppressed');
						result.suppressed++;
						continue;
					}
					await this.sender.send(job, recipient);
					await this.queue.finish(job, 'sent');
					result.sent++;
				} catch {
					const delay = Math.min(21_600_000, 60_000 * 2 ** Math.max(0, job.attempts - 1));
					await this.queue.finish(job, 'failed', new Date(this.now().getTime() + delay).toISOString());
					result.failed++;
				}
			}
			return result;
		} finally {
			this.running = false;
		}
	}
}
