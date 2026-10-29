import type { CheckoutAttendee, NominalTicket } from '@events-manager/contracts';
import { ApiError } from '../../shared/errors.js';
import type { TicketDelivery } from './deliver-tickets.js';

export interface AttendeePatch {
	attendee_document: string | null;
	attendee_email: string;
	attendee_name: string;
	attendee_phone: string | null;
	is_buyer: boolean;
	named_at: string;
}

export interface TicketRepository {
	/** Ingressos que a pessoa comprou ou nos quais foi nomeada com o e-mail da conta. */
	listForUser(userId: string, email: string): Promise<NominalTicket[]>;
	/** Um ingresso de um pedido desta pessoa, ou `null` se não for dela. */
	findForBuyer(ticketId: string, userId: string): Promise<NominalTicket | null>;
	updateAttendee(ticketId: string, patch: AttendeePatch): Promise<NominalTicket>;
}

const PAID_STATUSES = new Set(['paid', 'free']);

/**
 * Área de ingressos da pessoa, por unidade nominal. Quem comprou pode nomear
 * ou corrigir o participante de cada unidade até o check-in; quem foi nomeado
 * só vê o próprio ingresso.
 */
export class TicketService {
	constructor(
		private readonly repository: TicketRepository,
		private readonly delivery?: TicketDelivery,
		private readonly now: () => Date = () => new Date(),
	) {}

	async listForUser(userId: string, email: string) {
		const tickets = await this.repository.listForUser(userId, email);

		return tickets.map((ticket) => ({ ...ticket, can_edit_attendee: canEditAttendee(ticket, userId) }));
	}

	async nameAttendee(userId: string, ticketId: string, attendee: CheckoutAttendee) {
		const ticket = await this.repository.findForBuyer(ticketId, userId);
		if (!ticket) throw new ApiError('Ingresso não encontrado.', 404, 'TICKET_NOT_FOUND');
		if (ticket.registration.status === 'cancelled')
			throw new ApiError('Este pedido foi cancelado.', 409, 'TICKET_CANCELLED');
		if (ticket.check_in_date)
			throw new ApiError(
				'Este ingresso já passou pelo check-in e não pode mais ser alterado.',
				409,
				'TICKET_CHECKED_IN',
			);

		const updated = await this.repository.updateAttendee(ticketId, {
			attendee_name: attendee.name,
			attendee_email: attendee.email,
			attendee_phone: attendee.phone || null,
			attendee_document: attendee.document || null,
			is_buyer: sameEmail(attendee.email, ticket.registration.participant_email),
			named_at: this.now().toISOString(),
		});

		// Pedido pago: a pessoa nomeada recebe o ingresso agora. Pendente: a
		// confirmação do pagamento entrega tudo de uma vez.
		if (PAID_STATUSES.has(ticket.registration.payment_status ?? ''))
			await this.delivery?.execute([ticket.registration.id]).catch(() => undefined);

		return { ...updated, can_edit_attendee: canEditAttendee(updated, userId) };
	}
}

function canEditAttendee(ticket: NominalTicket, userId: string) {
	return ticket.registration.user_id === userId && !ticket.check_in_date && ticket.registration.status !== 'cancelled';
}

function sameEmail(left: string, right: string) {
	return left.trim().toLowerCase() === right.trim().toLowerCase();
}
