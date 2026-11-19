import type { NominalTicket } from '@events-manager/contracts';
export interface TicketPurchase {
	id: string;
	tickets: NominalTicket[];
}
export function groupTicketPurchases(tickets: NominalTicket[]): TicketPurchase[] {
	const purchases = new Map<string, TicketPurchase>();
	for (const ticket of tickets) {
		const id = ticket.registration.checkout_group_id || ticket.registration.id;
		const purchase = purchases.get(id) ?? { id, tickets: [] };
		purchase.tickets.push(ticket);
		purchases.set(id, purchase);
	}

	return [...purchases.values()];
}
export function purchasePaymentLabel(ticket: NominalTicket) {
	const registration = ticket.registration;
	if (registration.payment_status === 'free') return 'Gratuito';
	const method = registration.payment_method?.toLowerCase();
	if (method === 'card' || method === 'credit_card')
		return `Cartão de crédito${registration.card_installments ? (registration.card_installments > 1 ? ` · ${registration.card_installments} parcelas` : ' · à vista') : ''}`;
	if (method === 'boleto') return 'Boleto · à vista';
	if (method === 'pix' || registration.is_installment_payment)
		return registration.is_installment_payment
			? `Pix · ${registration.total_installments ?? ''} parcelas`
			: 'Pix · à vista';

	return 'Pagamento em processamento';
}
export const purchaseDate = (value: string | null | undefined) =>
	value
		? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(
				new Date(value.length === 10 ? `${value}T12:00:00` : value),
			)
		: 'A confirmar';
