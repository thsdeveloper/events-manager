export class SupabaseEmailDeliveryRepository {
    clients;
    constructor(clients) {
        this.clients = clients;
    }
    async claim(input) {
        const { data, error } = await this.clients.admin.rpc('claim_email_delivery', {
            target_idempotency_key: input.idempotencyKey,
            target_payload: input.payload,
            target_recipient: input.recipient,
            target_template: input.template,
        });
        if (error)
            throw error;
        return data;
    }
    async markSent(id, attempts, providerMessageId) {
        const { data, error } = await this.clients.admin
            .from('email_deliveries')
            .update({ status: 'sent', attempts, provider_message_id: providerMessageId, last_error: null })
            .eq('id', id)
            .select('*')
            .single();
        if (error)
            throw error;
        return { ...data, shouldSend: false };
    }
    async markFailed(id, attempts, lastError) {
        const { error } = await this.clients.admin
            .from('email_deliveries')
            .update({ status: 'failed', attempts, last_error: lastError.slice(0, 2_000) })
            .eq('id', id);
        if (error)
            throw error;
    }
}
//# sourceMappingURL=email-delivery-repository.js.map