import nodemailer from 'nodemailer';
export class EmailService {
    env;
    clients;
    transport;
    constructor(env, clients) {
        this.env = env;
        this.clients = clients;
        this.transport = nodemailer.createTransport({
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
            secure: env.SMTP_SECURE,
            ...(env.SMTP_USER
                ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } }
                : {}),
            connectionTimeout: 10_000,
        });
    }
    async sendRegistrationConfirmation(registration, idempotencyKey) {
        const { data: existing } = await this.clients.admin
            .from('email_deliveries')
            .select('*')
            .eq('idempotency_key', idempotencyKey)
            .maybeSingle();
        if (existing?.status === 'sent')
            return existing;
        const payload = {
            registrationId: registration.id,
            eventTitle: registration.event_id?.title,
            ticketCode: registration.ticket_code,
        };
        const { data: delivery, error } = await this.clients.admin
            .from('email_deliveries')
            .upsert({
            idempotency_key: idempotencyKey,
            template: 'registration-confirmation',
            recipient: registration.participant_email,
            payload,
        }, { onConflict: 'idempotency_key' })
            .select('*')
            .single();
        if (error)
            throw error;
        try {
            const result = await this.transport.sendMail({
                from: this.env.EMAIL_FROM,
                to: registration.participant_email,
                subject: `Confirmação de inscrição — ${registration.event_id?.title ?? 'Events Manager'}`,
                text: [
                    `Olá, ${registration.participant_name}.`,
                    `Sua inscrição em ${registration.event_id?.title ?? 'nosso evento'} está confirmada.`,
                    registration.ticket_code ? `Código do ingresso: ${registration.ticket_code}` : '',
                    'Guarde esta mensagem para apresentar no credenciamento.',
                ].filter(Boolean).join('\n\n'),
                html: `<main style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px">
          <h1 style="font-size:24px">Inscrição confirmada</h1>
          <p>Olá, ${escapeHtml(registration.participant_name)}.</p>
          <p>Sua inscrição em <strong>${escapeHtml(registration.event_id?.title ?? 'nosso evento')}</strong> está confirmada.</p>
          ${registration.ticket_code ? `<p style="font-size:20px"><strong>Código: ${escapeHtml(registration.ticket_code)}</strong></p>` : ''}
          <p>Guarde esta mensagem para apresentar no credenciamento.</p>
        </main>`,
            });
            const { data, error: updateError } = await this.clients.admin
                .from('email_deliveries')
                .update({ status: 'sent', attempts: delivery.attempts + 1, provider_message_id: result.messageId, last_error: null })
                .eq('id', delivery.id)
                .select('*')
                .single();
            if (updateError)
                throw updateError;
            return data;
        }
        catch (sendError) {
            await this.clients.admin
                .from('email_deliveries')
                .update({ status: 'failed', attempts: delivery.attempts + 1, last_error: sendError instanceof Error ? sendError.message : String(sendError) })
                .eq('id', delivery.id);
            throw sendError;
        }
    }
}
function escapeHtml(value) {
    return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}
//# sourceMappingURL=email-service.js.map