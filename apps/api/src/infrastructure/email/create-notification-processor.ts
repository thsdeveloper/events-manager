import { NotificationProcessor } from '../../application/notifications/notification-processor.js';
import type { ApiEnv } from '../../config/env.js';
import type { SupabaseClients } from '../supabase/clients.js';
import { SupabaseNotificationQueue } from '../supabase/notification-queue.js';
import { createEmailService } from './create-email-service.js';
export function createNotificationProcessor(env: ApiEnv, clients: SupabaseClients) {
	const { email } = createEmailService(env, clients);
	return new NotificationProcessor(new SupabaseNotificationQueue(clients), {
		async send(job, recipient) {
			if (!recipient.email) throw new Error('Destinatário indisponível.');
			await email.sendNotification({
				id: job.id,
				kind: job.kind,
				email: recipient.email,
				payload: { ...job.payload, ...recipient.details },
			});
		},
	});
}
