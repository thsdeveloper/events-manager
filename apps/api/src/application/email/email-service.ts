import type { EmailBrandingSource } from './email-branding.js';
import { renderEmail } from './email-template.js';

export interface PasswordChangedNotice {
	changedAt: Date;
	email: string;
	name?: string | null;
}

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
		private readonly branding: EmailBrandingSource,
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

		const branding = await this.branding.load();
		const { html, text } = renderEmail({
			branding,
			preheader: `Sua inscrição em ${eventTitle} está confirmada.`,
			blocks: [
				{ type: 'heading', text: 'Inscrição confirmada' },
				{ type: 'paragraph', text: `Olá, ${registration.participant_name}.` },
				{ type: 'paragraph', text: `Sua inscrição em ${eventTitle} está confirmada.` },
				...(registration.ticket_code
					? ([{ type: 'code', label: 'Código do ingresso', value: registration.ticket_code }] as const)
					: []),
				{ type: 'paragraph', text: 'Apresente este código no credenciamento do evento.' },
				{ type: 'button', label: 'Ver meus ingressos', url: `${branding.siteUrl}/perfil?section=ingressos` },
			],
			footerNote: 'Guarde esta mensagem: ela dá acesso ao seu ingresso.',
		});

		try {
			const result = await this.gateway.send({
				from: this.from,
				to: registration.participant_email,
				subject: `Confirmação de inscrição — ${eventTitle}`,
				text,
				html,
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

	/**
	 * Out-of-band alarm for a password change: it is the only signal that reaches
	 * the account owner when the change was not theirs. Deliberately says nothing
	 * about the new password and offers the recovery flow, so a victim who reads
	 * it has an immediate way to take the account back.
	 *
	 * The idempotency key must be unique per change — reusing one would silently
	 * skip the alert on the next change.
	 */
	async sendPasswordChangedNotice(notice: PasswordChangedNotice, idempotencyKey: string) {
		const delivery = await this.deliveries.claim({
			idempotencyKey,
			template: 'password-changed',
			recipient: notice.email,
			payload: { changedAt: notice.changedAt.toISOString() },
		});
		if (!delivery.shouldSend) return delivery;

		const branding = await this.branding.load();
		const changedAt = new Intl.DateTimeFormat('pt-BR', {
			dateStyle: 'short',
			timeStyle: 'short',
			timeZone: 'America/Sao_Paulo',
		}).format(notice.changedAt);

		const { html, text } = renderEmail({
			branding,
			preheader: 'A senha da sua conta foi alterada.',
			blocks: [
				{ type: 'heading', text: 'Sua senha foi alterada' },
				{ type: 'paragraph', text: `Olá${notice.name ? `, ${notice.name}` : ''}.` },
				{
					type: 'paragraph',
					text: 'A senha da sua conta foi alterada e as sessões abertas em outros dispositivos foram encerradas.',
				},
				{ type: 'details', rows: [{ label: 'Data da alteração', value: `${changedAt} (horário de Brasília)` }] },
				{
					type: 'paragraph',
					text: 'Se foi você, nenhuma ação é necessária. Se não reconhece esta alteração, redefina sua senha agora mesmo.',
				},
				{ type: 'button', label: 'Redefinir minha senha', url: `${branding.siteUrl}/esqueci-senha` },
			],
			footerNote: 'Nunca pedimos sua senha por e-mail.',
		});

		try {
			const result = await this.gateway.send({
				from: this.from,
				to: notice.email,
				subject: 'Sua senha foi alterada',
				text,
				html,
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
