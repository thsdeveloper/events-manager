/** Payment confirmation is independent of fee reconciliation and funds available for payout. */
export interface FinanceMovement {
	id: string;
	date_created: string | null;
	status: string;
	settlement_status: 'settled' | 'pending' | 'not_applicable';
	provider: string | null;
	event_type: string | null;
	provider_object_id: string | null;
	provider_event_id: string | null;
	provider_status: string | null;
	amount: number | null;
	provider_fee: number | null;
	platform_fee: number | null;
	organizer_net: number | null;
}
export interface FinanceTransactionDetails {
	transaction: FinanceMovement;
	registration: {
		id: string;
		status: string | null;
		payment_status: string | null;
		payment_method: string | null;
		participant_name: string | null;
		participant_email: string | null;
		participant_phone: string | null;
		participant_document: string | null;
		quantity: number;
		unit_price: number | null;
		service_fee: number | null;
		total_amount: number | null;
		payment_amount: number | null;
		is_installment_payment: boolean;
		total_installments: number | null;
		installment_plan_status: string | null;
		card_installments: number | null;
		checkout_group_id: string | null;
		date_created: string | null;
		date_updated: string | null;
		cancelled_at: string | null;
		cancelled_reason: string | null;
		provider_checkout_id: string | null;
		provider_refund_id: string | null;
		receipt_url: string | null;
		notes: string | null;
	};
	event: {
		id: string;
		title: string | null;
		slug: string | null;
		start_date: string | null;
		end_date: string | null;
		location_name: string | null;
		location_address: string | null;
		event_type: string | null;
	};
	ticket_type: { id: string; title: string | null } | null;
	installments: {
		id: string;
		installment_number: number;
		total_installments: number;
		amount: number;
		status: string;
		due_date: string | null;
		paid_at: string | null;
		payment_confirmed_at: string | null;
		provider_transaction_id: string | null;
	}[];
	tickets: {
		id: string;
		sequence: number;
		ticket_code: string | null;
		attendee_name: string | null;
		attendee_email: string | null;
		is_buyer: boolean;
		check_in_date: string | null;
		named_at: string | null;
		unit_price: number | null;
		service_fee: number | null;
		discount: number | null;
		total_amount: number | null;
	}[];
	movements: FinanceMovement[];
}
