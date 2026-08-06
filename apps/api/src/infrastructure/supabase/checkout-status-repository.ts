import type { Database } from '@events-manager/contracts';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CheckoutLocator, CheckoutStatusRepository } from '../../application/payments/get-checkout-status.js';

const checkoutStatusSelection = `
  id,
  status,
  payment_status,
  total_amount,
  ticket_code,
  event_id:events!inner(id,title,slug)
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

			return {
				id: registration.id,
				status: registration.status,
				paymentStatus: registration.payment_status,
				totalAmount: registration.total_amount === null ? null : Number(registration.total_amount),
				ticketCode: registration.ticket_code,
				event,
			};
		});
	}
}
