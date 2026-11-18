import type { EmailBrandingSource } from './email-branding.js';
import { renderEmail } from './email-template.js';
import type { AttendeeTicketNotice, PurchaseConfirmationNotice, TicketMailer } from '../tickets/deliver-tickets.js';

export interface PasswordChangedNotice {
	changedAt: Date;
	email: string;
	name?: string | null;
}

export interface DocumentChangedNotice {
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

const eventDateFormatter = new Intl.DateTimeFormat('pt-BR', {
	dateStyle: 'full',
	timeStyle: 'short',
	timeZone: 'America/Sao_Paulo',
});

function formatEventDate(value: string | null) {
	if (!value) return null;
	const date = new Date(value);

	return Number.isNaN(date.getTime()) ? null : eventDateFormatter.format(date);
}

export class EmailService implements TicketMailer {
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

	/**
	 * Aviso de CPF alterado. Como no aviso de senha, é o único sinal que chega a
	 * quem perdeu a conta. Não imprime nem o CPF antigo nem o novo: o e-mail pode
	 * ser lido por terceiros, e o dado em si não ajuda a vítima a reagir.
	 */
	async sendDocumentChangedNotice(notice: DocumentChangedNotice, idempotencyKey: string) {
		const delivery = await this.deliveries.claim({
			idempotencyKey,
			template: 'document-changed',
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
			preheader: 'O CPF da sua conta foi alterado.',
			blocks: [
				{ type: 'heading', text: 'Seu CPF foi alterado' },
				{ type: 'paragraph', text: `Olá${notice.name ? `, ${notice.name}` : ''}.` },
				{ type: 'paragraph', text: 'O CPF cadastrado na sua conta foi alterado a partir da área de dados pessoais.' },
				{ type: 'details', rows: [{ label: 'Data da alteração', value: `${changedAt} (horário de Brasília)` }] },
				{
					type: 'paragraph',
					text: 'Se foi você, nenhuma ação é necessária. Se não reconhece esta alteração, redefina sua senha agora mesmo e fale com o suporte.',
				},
				{ type: 'button', label: 'Redefinir minha senha', url: `${branding.siteUrl}/esqueci-senha` },
			],
			footerNote: 'Nunca pedimos seu CPF ou sua senha por e-mail.',
		});

		try {
			const result = await this.gateway.send({
				from: this.from,
				to: notice.email,
				subject: 'Seu CPF foi alterado',
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
	 * Recibo da compra para quem pagou: todos os ingressos do checkout, com o
	 * participante de cada um. Um ingresso sem participante aparece como "a
	 * informar", com o caminho para nomeá-lo na área de ingressos.
	 */
	async sendPurchaseConfirmation(notice: PurchaseConfirmationNotice, idempotencyKey: string) {
		const delivery = await this.deliveries.claim({
			idempotencyKey,
			template: 'purchase-confirmation',
			recipient: notice.buyerEmail,
			payload: { eventTitle: notice.eventTitle, ticketCodes: notice.tickets.map((ticket) => ticket.ticketCode) },
		});
		if (!delivery.shouldSend) return delivery;

		const branding = await this.branding.load();
		const pending = notice.tickets.filter((ticket) => !ticket.attendeeName).length;
		const eventDate = formatEventDate(notice.eventDate);
		const { html, text } = renderEmail({
			branding,
			preheader: `Sua compra para ${notice.eventTitle} está confirmada.`,
			blocks: [
				{ type: 'heading', text: 'Compra confirmada' },
				{ type: 'paragraph', text: `Olá, ${notice.buyerName}.` },
				{
					type: 'paragraph',
					text: `Recebemos o pagamento da sua compra para ${notice.eventTitle}${eventDate ? `, ${eventDate}` : ''}. Estes são os ingressos do pedido:`,
				},
				{
					type: 'details',
					rows: notice.tickets.map((ticket) => ({
						label: `${ticket.ticketTypeTitle ?? 'Ingresso'} · ${ticket.ticketCode}`,
						value: ticket.attendeeName ?? 'participante a informar',
					})),
				},
				...(pending > 0
					? ([
							{
								type: 'paragraph',
								text:
									pending === 1
										? 'Um ingresso ainda não tem participante. Informe o nome e o e-mail na sua área de ingressos para que a pessoa receba o ingresso dela.'
										: `${pending} ingressos ainda não têm participante. Informe o nome e o e-mail de cada um na sua área de ingressos para que cada pessoa receba o seu.`,
							},
						] as const)
					: []),
				{
					type: 'paragraph',
					text: 'Quem foi nomeado com outro e-mail recebe o próprio ingresso em uma mensagem separada.',
				},
				{ type: 'button', label: 'Ver meus ingressos', url: `${branding.siteUrl}/perfil?section=ingressos` },
				...(notice.receiptUrl
					? ([{ type: 'button', label: 'Ver comprovante de pagamento', url: notice.receiptUrl }] as const)
					: []),
			],
			footerNote: 'Guarde esta mensagem: ela reúne os códigos dos seus ingressos.',
		});

		return this.dispatch(delivery, {
			to: notice.buyerEmail,
			subject: `Compra confirmada — ${notice.eventTitle}`,
			html,
			text,
		});
	}

	/**
	 * Ingresso nominal para quem vai ao evento sem ter comprado. Diz quem
	 * comprou, porque a pessoa pode não estar esperando a mensagem.
	 */
	async sendAttendeeTicket(notice: AttendeeTicketNotice, idempotencyKey: string) {
		const delivery = await this.deliveries.claim({
			idempotencyKey,
			template: 'attendee-ticket',
			recipient: notice.attendeeEmail,
			payload: { eventTitle: notice.eventTitle, ticketCode: notice.ticketCode },
		});
		if (!delivery.shouldSend) return delivery;

		const branding = await this.branding.load();
		const eventDate = formatEventDate(notice.eventDate);
		const { html, text } = renderEmail({
			branding,
			preheader: `${notice.buyerName} comprou um ingresso para você em ${notice.eventTitle}.`,
			blocks: [
				{ type: 'heading', text: 'Seu ingresso chegou' },
				{ type: 'paragraph', text: `Olá, ${notice.attendeeName}.` },
				{
					type: 'paragraph',
					text: `${notice.buyerName} comprou um ingresso em seu nome para ${notice.eventTitle}.`,
				},
				{
					type: 'details',
					rows: [
						{ label: 'Ingresso', value: notice.ticketTypeTitle ?? 'Ingresso' },
						...(eventDate ? [{ label: 'Quando', value: eventDate }] : []),
						...(notice.locationName ? [{ label: 'Onde', value: notice.locationName }] : []),
					],
				},
				{ type: 'code', label: 'Código do ingresso', value: notice.ticketCode },
				{ type: 'paragraph', text: 'Apresente este código no credenciamento do evento.' },
				{
					type: 'paragraph',
					text: `Se você criar uma conta com este e-mail (${notice.attendeeEmail}), o ingresso também aparece na sua área de ingressos.`,
				},
				{ type: 'button', label: 'Ver meus ingressos', url: `${branding.siteUrl}/perfil?section=ingressos` },
			],
			footerNote: 'Guarde esta mensagem: ela dá acesso ao seu ingresso.',
		});

		return this.dispatch(delivery, {
			to: notice.attendeeEmail,
			subject: `Seu ingresso para ${notice.eventTitle}`,
			html,
			text,
		});
	}

	async sendTeamInvitation(
		notice: { id: string; email: string; url: string; expiresAt: string },
		idempotencyKey: string,
	) {
		// The token/link never enters delivery payloads or audit logs.
		const delivery = await this.deliveries.claim({
			idempotencyKey,
			template: 'team-invitation',
			recipient: notice.email,
			payload: { invitationId: notice.id, expiresAt: notice.expiresAt },
		});
		if (!delivery.shouldSend) return delivery;
		const branding = await this.branding.load();
		const { html, text } = renderEmail({
			branding,
			preheader: 'Você recebeu um convite para uma equipe na Flouvi.',
			blocks: [
				{ type: 'heading', text: 'Você foi convidado para uma equipe' },
				{
					type: 'paragraph',
					text: 'Entre ou crie sua conta com este endereço de e-mail para aceitar. O convite vale por 7 dias e só pode ser usado uma vez.',
				},
				{ type: 'button', label: 'Ver convite', url: notice.url },
				{
					type: 'paragraph',
					text: 'Se não reconhece o convite, ignore esta mensagem. Nenhum acesso será criado sem o seu aceite.',
				},
			],
		});
		return this.dispatch(
			delivery,
			{ to: notice.email, subject: 'Convite para equipe na Flouvi', html, text },
			'Não foi possível enviar o convite.',
		);
	}

	private async dispatch(
		delivery: EmailDelivery,
		message: { html: string; subject: string; text: string; to: string },
		safeError?: string,
	) {
		try {
			const result = await this.gateway.send({ from: this.from, ...message });
			return this.deliveries.markSent(delivery.id, delivery.attempts + 1, result.messageId);
		} catch (error) {
			await this.deliveries.markFailed(
				delivery.id,
				delivery.attempts + 1,
				safeError ?? (error instanceof Error ? error.message : String(error)),
			);
			throw error;
		}
	}
}
