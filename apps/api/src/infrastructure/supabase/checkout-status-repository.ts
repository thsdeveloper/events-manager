import type { Database } from '@events-manager/contracts';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CheckoutLocator, CheckoutStatusRepository } from '../../application/payments/get-checkout-status.js';

const checkoutStatusSelection = `
  id,
  status,
  payment_status,
  total_amount,
  ticket_code,
  receipt_url,
  provider_checkout_id,
  event_id:events!inner(id,title,slug),
  tickets:registration_tickets(id,sequence,ticket_code,attendee_name,attendee_email,is_buyer,ticket_type_id:event_tickets(title))
`;

export class SupabaseCheckoutStatusRepository implements CheckoutStatusRepository {
	constructor(private readonly database: SupabaseClient<Database>) {}

	async findByUser(userId: string, locator: CheckoutLocator) {
		let query = this.database.from('event_registrations').select(checkoutStatusSelection).eq('user_id', userId);

		query = locator.registrationId
			? query.eq('id', locator.registrationId)
			: query.contains('additional_info', { checkout_group_id: locator.checkoutGroupId });

		const { data, error } = await query.order('date_created');
		if (error) throw error;

		return (data ?? []).map((registration) => {
			const event = registration.event_id as unknown as { id: string; slug: string; title: string };
			const tickets = ((registration as unknown as { tickets?: unknown[] }).tickets ?? []) as Array<{
				attendee_email: string | null;
				attendee_name: string | null;
				id: string;
				is_buyer: boolean;
				sequence: number;
				ticket_code: string;
				ticket_type_id: { title: string } | null;
			}>;

			return {
				id: registration.id,
				status: registration.status,
				paymentStatus: registration.payment_status,
				totalAmount: registration.total_amount === null ? null : Number(registration.total_amount),
				ticketCode: registration.ticket_code,
				receiptUrl: registration.receipt_url ?? null,
				providerCheckoutId: registration.provider_checkout_id ?? null,
				event,
				tickets: [...tickets]
					.sort((left, right) => left.sequence - right.sequence)
					.map((ticket) => ({
						id: ticket.id,
						sequence: ticket.sequence,
						ticketCode: ticket.ticket_code,
						attendeeName: ticket.attendee_name,
						attendeeEmail: ticket.attendee_email,
						isBuyer: ticket.is_buyer,
						ticketType: ticket.ticket_type_id?.title ?? null,
					})),
			};
		});
	}
}
