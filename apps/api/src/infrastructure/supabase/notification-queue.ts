import type { SupabaseClients } from './clients.js';
import type {
	NotificationQueue,
	NotificationJob,
	NotificationRecipient,
} from '../../application/notifications/notification-processor.js';
import { z } from 'zod';
import {
	notificationCatalog,
	userEmailPreferencesSchema,
	organizationEmailPreferencesSchema,
} from '@events-manager/contracts';
const jobSchema = z.object({
	id: z.string(),
	lease_token: z.string(),
	kind: z.enum(Object.keys(notificationCatalog) as [NotificationJob['kind'], ...NotificationJob['kind'][]]),
	user_id: z.string(),
	organizer_id: z.string().nullable(),
	payload: z.record(z.string(), z.unknown()),
	attempts: z.number().int().positive(),
});
const recipientSchema = z.object({
	email: z.string().nullable().default(null),
	verified: z.boolean().default(false),
	active: z.boolean().nullable().default(false).transform(Boolean),
	eligible: z.boolean().default(false),
	userSettings: userEmailPreferencesSchema.prefault({}),
	organizationSettings: organizationEmailPreferencesSchema.nullable().default(null),
	details: z.record(z.string(), z.unknown()).default({}),
});
export class SupabaseNotificationQueue implements NotificationQueue {
	constructor(private readonly clients: SupabaseClients) {}
	async claim(limit: number): Promise<NotificationJob[]> {
		const { data, error } = await this.clients.admin.rpc('claim_email_notifications', { batch_size: limit });
		if (error) throw error;
		return z.array(jobSchema).parse(data);
	}
	async recipient(job: NotificationJob): Promise<NotificationRecipient> {
		const { data, error } = await this.clients.admin.rpc('email_notification_recipient', {
			job_id: job.id,
			token: job.lease_token,
		});
		if (error) throw error;
		return recipientSchema.parse(data);
	}
	async finish(job: NotificationJob, status: 'sent' | 'suppressed' | 'failed', retryAt?: string): Promise<void> {
		const { data, error } = await this.clients.admin.rpc('finish_email_notification', {
			job_id: job.id,
			token: job.lease_token,
			outcome: status,
			retry_at: retryAt ?? null,
		});
		if (error) throw error;
		if (data !== true) throw new Error('A concessão da notificação expirou.');
	}
	async schedule(): Promise<void> {
		const { error } = await this.clients.admin.rpc('schedule_email_notifications');
		if (error) throw error;
	}
}
