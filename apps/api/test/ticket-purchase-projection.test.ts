import { expect, it } from 'vitest';
import { mapNominalTicket } from '../src/infrastructure/supabase/ticket-selection.js';
it('shows the selected payment method while pending and never exposes provider metadata', () => {
	const ticket = mapNominalTicket({
		id: 't',
		registration: {
			id: 'r',
			payment_method: null,
			total_amount: 100,
			additional_info: {
				checkout_group_id: 'g',
				payment_method_requested: 'CARD',
				card_installments: 3,
				payment_preferences: { internal: true },
			},
		},
	});
	expect(ticket.registration).toMatchObject({ checkout_group_id: 'g', payment_method: 'card', card_installments: 3 });
	expect(ticket.registration).not.toHaveProperty('additional_info');
});
