export type TicketServiceFeeType = 'absorbed' | 'passed_to_buyer';
export type TicketVisibility = 'public' | 'invited_only' | 'manual';

/**
 * A ticket as the form produces it. The same shape serves a ticket that already
 * lives in the database (`id` present) and one still being drafted in the event
 * wizard (`clientId` only), so a single sheet covers both callers.
 */
export interface TicketDraft {
	id?: string;
	clientId?: string;
	title: string;
	description?: string | null;
	quantity: number;
	price: number;
	service_fee_type: TicketServiceFeeType;
	visibility: TicketVisibility;
	sale_start_date?: string | null;
	sale_end_date?: string | null;
	min_quantity_per_purchase: number;
	max_quantity_per_purchase: number;
	allow_installments: boolean;
	max_installments?: number | null;
	min_amount_for_installments?: number | null;
}

/** Identity that works before the server assigns one. */
export function ticketKey(ticket: TicketDraft) {
	return ticket.id ?? ticket.clientId ?? ticket.title;
}
