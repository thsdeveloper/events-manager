export interface RegistrationForEmail {
	event_id?: { title?: string | null } | null;
	id: string;
	participant_email: string;
	participant_name: string;
	ticket_code?: string | null;
}

export interface EmailDelivery extends Record<string, unknown> {
	attempts: number;
	id: string;
	shouldSend: boolean;
	status: string;
}

export interface EmailDeliveryRepository {
	claim(input: {
		idempotencyKey: string;
		payload: Record<string, unknown>;
		recipient: string;
		template: string;
	}): Promise<EmailDelivery>;
	markFailed(id: string, attempts: number, error: string): Promise<void>;
	markSent(id: string, attempts: number, providerMessageId: string): Promise<EmailDelivery>;
}

export interface EmailGateway {
	send(input: {
		from: string;
		html: string;
		subject: string;
		text: string;
		to: string;
	}): Promise<{ messageId: string }>;
}

export class EmailService {
	constructor(
		private readonly deliveries: EmailDeliveryRepository,
		private readonly gateway: EmailGateway,
		private readonly from: string,
	) {}

	async sendRegistrationConfirmation(registration: RegistrationForEmail, idempotencyKey: string) {
		const eventTitle = registration.event_id?.title ?? 'Events Manager';
		const delivery = await this.deliveries.claim({
			idempotencyKey,
			template: 'registration-confirmation',
			recipient: registration.participant_email,
			payload: { registrationId: registration.id, eventTitle, ticketCode: registration.ticket_code },
		});
		if (!delivery.shouldSend) return delivery;

		try {
			const result = await this.gateway.send({
				from: this.from,
				to: registration.participant_email,
				subject: `Confirmação de inscrição — ${eventTitle}`,
				text: [
					`Olá, ${registration.participant_name}.`,
					`Sua inscrição em ${eventTitle} está confirmada.`,
					registration.ticket_code ? `Código do ingresso: ${registration.ticket_code}` : '',
					'Guarde esta mensagem para apresentar no credenciamento.',
				]
					.filter(Boolean)
					.join('\n\n'),
				html: `<main style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px">
          <h1 style="font-size:24px">Inscrição confirmada</h1>
          <p>Olá, ${escapeHtml(registration.participant_name)}.</p>
          <p>Sua inscrição em <strong>${escapeHtml(eventTitle)}</strong> está confirmada.</p>
          ${registration.ticket_code ? `<p style="font-size:20px"><strong>Código: ${escapeHtml(registration.ticket_code)}</strong></p>` : ''}
          <p>Guarde esta mensagem para apresentar no credenciamento.</p>
        </main>`,
			});
			return this.deliveries.markSent(delivery.id, delivery.attempts + 1, result.messageId);
		} catch (error) {
			await this.deliveries.markFailed(
				delivery.id,
				delivery.attempts + 1,
				error instanceof Error ? error.message : String(error),
			);
			throw error;
		}
	}
}

function escapeHtml(value: string) {
	return value.replace(
		/[&<>'"]/g,
		(character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!,
	);
}
