import type {
	CheckoutAttendee,
	NominalTicket,
	PurchaseInstallment,
	TicketPurchaseDetails,
} from '@events-manager/contracts';
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
	listInstallments(registrationIds: string[], userId: string): Promise<PurchaseInstallment[]>;
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

		return tickets.map((ticket) => presentTicket(ticket, userId));
	}

	async purchaseDetails(userId: string, email: string, purchaseId: string): Promise<TicketPurchaseDetails> {
		const visible = await this.listForUser(userId, email);
		const selected = visible.find(
			(ticket) => ticket.registration.checkout_group_id === purchaseId || ticket.registration.id === purchaseId,
		);
		if (!selected) throw new ApiError('Compra não encontrada.', 404, 'PURCHASE_NOT_FOUND');
		const id = selected.registration.checkout_group_id || selected.registration.id;
		const tickets = visible.filter(
			(ticket) => (ticket.registration.checkout_group_id || ticket.registration.id) === id,
		);
		const registrationIds = [
			...new Set(tickets.filter((ticket) => ticket.purchased_by_me).map((ticket) => ticket.registration.id)),
		];
		const installments = registrationIds.length ? await this.repository.listInstallments(registrationIds, userId) : [];
		return { id, tickets, installments };
	}

	async nameAttendee(userId: string, ticketId: string, attendee: CheckoutAttendee) {
		const ticket = await this.repository.findForBuyer(ticketId, userId);
		if (!ticket) throw new ApiError('Ingresso não encontrado.', 404, 'TICKET_NOT_FOUND');
		if (ticket.is_buyer)
			throw new ApiError('O ingresso do comprador não permite alterar o participante.', 409, 'BUYER_TICKET_LOCKED');
		if (ticket.registration.status === 'cancelled' || ticket.registration.payment_status === 'refunded')
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

		return presentTicket(updated, userId);
	}
}

/** A reserva aparece no histórico, mas não libera transmissão nem comprovante de pagamento. */
function presentTicket(ticket: NominalTicket, userId: string): NominalTicket {
	const paid =
		ticket.registration.status !== 'cancelled' && PAID_STATUSES.has(ticket.registration.payment_status ?? '');
	const named = Boolean(ticket.attendee_name?.trim() && ticket.attendee_email?.trim());
	return {
		...ticket,
		purchased_by_me: ticket.registration.user_id === userId,
		can_edit_attendee: canEditAttendee(ticket, userId),
		event: { ...ticket.event, online_url: paid && named ? ticket.event.online_url : null },
		registration: { ...ticket.registration, receipt_url: paid ? ticket.registration.receipt_url : null },
	};
}

function canEditAttendee(ticket: NominalTicket, userId: string) {
	return (
		!ticket.is_buyer &&
		ticket.registration.payment_status !== 'refunded' &&
		ticket.registration.user_id === userId &&
		!ticket.check_in_date &&
		ticket.registration.status !== 'cancelled'
	);
}

function sameEmail(left: string, right: string) {
	return left.trim().toLowerCase() === right.trim().toLowerCase();
}
