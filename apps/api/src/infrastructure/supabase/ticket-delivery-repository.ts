import type { Database } from '@events-manager/contracts';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DeliverableOrder, TicketDeliveryRepository } from '../../application/tickets/deliver-tickets.js';

const deliverySelection = `
  id,
  participant_name,
  participant_email,
  payment_status,
  receipt_url,
  additional_info,
  event_id:events!inner(id,title,slug,start_date,location_name),
  tickets:registration_tickets(id,sequence,ticket_code,attendee_name,attendee_email,is_buyer,ticket_type_id:event_tickets(title))
`;

export class SupabaseTicketDeliveryRepository implements TicketDeliveryRepository {
	constructor(private readonly database: SupabaseClient<Database>) {}

	async findOrders(registrationIds: string[]): Promise<DeliverableOrder[]> {
		const { data, error } = await this.database
			.from('event_registrations')
			.select(deliverySelection)
			.in('id', registrationIds)
			.order('date_created');
		if (error) throw error;

		return (data ?? []).map((row) => {
			const event = row.event_id as unknown as {
				id: string;
				location_name: string | null;
				slug: string;
				start_date: string | null;
				title: string;
			};
			const info = (row.additional_info ?? {}) as { checkout_group_id?: string };
			const tickets = (row.tickets ?? []) as unknown as Array<{
				attendee_email: string | null;
				attendee_name: string | null;
				id: string;
				is_buyer: boolean;
				sequence: number;
				ticket_code: string;
				ticket_type_id: { title: string } | null;
			}>;

			return {
				id: row.id,
				checkoutGroupId: info.checkout_group_id ?? null,
				buyerName: row.participant_name,
				buyerEmail: row.participant_email,
				paymentStatus: row.payment_status,
				receiptUrl: row.receipt_url ?? null,
				event: {
					id: event.id,
					title: event.title,
					slug: event.slug,
					startDate: event.start_date,
					locationName: event.location_name,
				},
				tickets: [...tickets]
					.sort((left, right) => left.sequence - right.sequence)
					.map((ticket) => ({
						id: ticket.id,
						ticketCode: ticket.ticket_code,
						attendeeName: ticket.attendee_name,
						attendeeEmail: ticket.attendee_email,
						isBuyer: ticket.is_buyer,
						ticketTypeTitle: ticket.ticket_type_id?.title ?? null,
					})),
			};
		});
	}
}
