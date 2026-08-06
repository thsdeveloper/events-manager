import type { Json } from '@events-manager/contracts';
import type { EmailDelivery, EmailDeliveryRepository } from '../../application/email/email-service.js';
import type { SupabaseClients } from './clients.js';

export class SupabaseEmailDeliveryRepository implements EmailDeliveryRepository {
	constructor(private readonly clients: SupabaseClients) {}

	async claim(input: {
		idempotencyKey: string;
		payload: Record<string, unknown>;
		recipient: string;
		template: string;
	}) {
		const { data, error } = await this.clients.admin.rpc('claim_email_delivery', {
			target_idempotency_key: input.idempotencyKey,
			target_payload: input.payload as Json,
			target_recipient: input.recipient,
			target_template: input.template,
		});
		if (error) throw error;
		return data as unknown as EmailDelivery;
	}

	async markSent(id: string, attempts: number, providerMessageId: string) {
		const { data, error } = await this.clients.admin
			.from('email_deliveries')
			.update({ status: 'sent', attempts, provider_message_id: providerMessageId, last_error: null })
			.eq('id', id)
			.select('*')
			.single();
		if (error) throw error;
		return { ...data, shouldSend: false } as EmailDelivery;
	}

	async markFailed(id: string, attempts: number, lastError: string) {
		const { error } = await this.clients.admin
			.from('email_deliveries')
			.update({ status: 'failed', attempts, last_error: lastError.slice(0, 2_000) })
			.eq('id', id);
		if (error) throw error;
	}
}
