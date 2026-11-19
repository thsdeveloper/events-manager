/**
 * Entrega dos ingressos por e-mail depois de o pagamento entrar.
 *
 * Quem comprou recebe um recibo por checkout com todos os ingressos, inclusive
 * os que ainda não têm participante. Cada participante nomeado com e-mail
 * diferente do de quem comprou recebe o próprio ingresso. A idempotência fica
 * nas chaves de entrega: webhook, reconciliação, consulta de status e a
 * nomeação tardia podem todos chamar `execute`, e cada pessoa recebe uma vez.
 */

export interface DeliverableTicket {
	attendeeEmail: string | null;
	attendeeName: string | null;
	id: string;
	isBuyer: boolean;
	ticketCode: string;
	ticketTypeTitle: string | null;
}

export interface DeliverableOrder {
	buyerEmail: string;
	buyerName: string;
	/** Compras com vários tipos de ingresso geram um pedido por tipo; o grupo os reúne. */
	checkoutGroupId: string | null;
	event: { id: string; locationName: string | null; slug: string; startDate: string | null; title: string };
	id: string;
	paymentStatus: string | null;
	receiptUrl: string | null;
	tickets: DeliverableTicket[];
}

export interface PurchaseConfirmationNotice {
	buyerEmail: string;
	buyerName: string;
	eventDate: string | null;
	eventTitle: string;
	locationName: string | null;
	receiptUrl: string | null;
	tickets: DeliverableTicket[];
}

export interface AttendeeTicketNotice {
	attendeeEmail: string;
	attendeeName: string;
	buyerName: string;
	eventDate: string | null;
	eventTitle: string;
	locationName: string | null;
	ticketCode: string;
	ticketTypeTitle: string | null;
}

export interface TicketDeliveryRepository {
	findOrders(registrationIds: string[]): Promise<DeliverableOrder[]>;
}

export interface TicketMailer {
	sendAttendeeTicket(notice: AttendeeTicketNotice, idempotencyKey: string): Promise<unknown>;
	sendPurchaseConfirmation(notice: PurchaseConfirmationNotice, idempotencyKey: string): Promise<unknown>;
}

export interface TicketDeliveryLogger {
	error(context: Record<string, unknown>, message: string): void;
}

export interface TicketDeliveryOptions {
	/**
	 * Sufixo nas chaves de idempotência. Um reenvio pedido pelo organizador
	 * precisa sair de verdade, então usa uma chave nova (o id da requisição).
	 */
	keySuffix?: string;
	/** Entrega só este ingresso: o recibo se for de quem comprou, senão o e-mail do participante. */
	onlyTicketId?: string;
}

/** Porta usada por quem confirma pagamentos; ver `DeliverTickets`. */
export interface TicketDelivery {
	execute(registrationIds: string[], options?: TicketDeliveryOptions): Promise<TicketDeliveryResult>;
}

export interface TicketDeliveryResult {
	attendeeTickets: number;
	confirmations: number;
	failed: number;
}

const PAID_STATUSES = new Set(['paid', 'free']);

export class DeliverTickets implements TicketDelivery {
	constructor(
		private readonly repository: TicketDeliveryRepository,
		private readonly mailer: TicketMailer,
		private readonly logger: TicketDeliveryLogger = { error: () => {} },
	) {}

	async execute(registrationIds: string[], options: TicketDeliveryOptions = {}): Promise<TicketDeliveryResult> {
		const result: TicketDeliveryResult = { attendeeTickets: 0, confirmations: 0, failed: 0 };
		if (!registrationIds.length) return result;

		const suffix = options.keySuffix ? `-${options.keySuffix}` : '';
		const orders = (await this.repository.findOrders(registrationIds)).filter((order) =>
			PAID_STATUSES.has(order.paymentStatus ?? ''),
		);

		for (const group of groupByCheckout(orders)) {
			const [first] = group;
			const tickets = group.flatMap((order) => order.tickets);
			const chosen = options.onlyTicketId ? tickets.find((ticket) => ticket.id === options.onlyTicketId) : undefined;
			if (options.onlyTicketId && !chosen) continue;
			const sendReceipt = !chosen || chosen.isBuyer || !chosen.attendeeEmail;
			if (sendReceipt)
				try {
					await this.mailer.sendPurchaseConfirmation(
						{
							buyerEmail: first.buyerEmail,
							buyerName: first.buyerName,
							eventDate: first.event.startDate,
							eventTitle: first.event.title,
							locationName: first.event.locationName,
							receiptUrl: first.receiptUrl,
							tickets,
						},
						`purchase-confirmation-${first.checkoutGroupId ?? first.id}${suffix}`,
					);
					result.confirmations += 1;
				} catch (error) {
					result.failed += 1;
					this.logger.error({ err: error, registrationId: first.id }, 'Failed to send purchase confirmation');
				}

			const buyerEmail = first.buyerEmail.trim().toLowerCase();
			for (const order of group) {
				for (const ticket of order.tickets) {
					if (chosen && ticket.id !== chosen.id) continue;
					const email = ticket.attendeeEmail?.trim().toLowerCase();
					if (!email || !ticket.attendeeName || (email === buyerEmail && !chosen)) continue;
					if (chosen && (chosen.isBuyer || email === buyerEmail)) continue;
					try {
						await this.mailer.sendAttendeeTicket(
							{
								attendeeEmail: ticket.attendeeEmail!,
								attendeeName: ticket.attendeeName,
								buyerName: order.buyerName,
								eventDate: order.event.startDate,
								eventTitle: order.event.title,
								locationName: order.event.locationName,
								ticketCode: ticket.ticketCode,
								ticketTypeTitle: ticket.ticketTypeTitle,
							},
							`attendee-ticket-${ticket.id}-${email}${suffix}`,
						);
						result.attendeeTickets += 1;
					} catch (error) {
						result.failed += 1;
						this.logger.error({ err: error, ticketId: ticket.id }, 'Failed to send attendee ticket');
					}
				}
			}
		}

		return result;
	}
}

function groupByCheckout(orders: DeliverableOrder[]): DeliverableOrder[][] {
	const groups = new Map<string, DeliverableOrder[]>();
	for (const order of orders) {
		const key = order.checkoutGroupId ?? order.id;
		groups.set(key, [...(groups.get(key) ?? []), order]);
	}

	return [...groups.values()];
}
