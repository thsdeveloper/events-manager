import type { FinanceMovement, FinanceTransactionDetails } from '@events-manager/contracts';

export function record(value: unknown): Record<string, unknown> {
	return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
const text = (value: unknown) => (typeof value === 'string' ? value : null);
const number = (value: unknown) => (value != null && Number.isFinite(Number(value)) ? Number(value) : null);

export function presentMovement(value: unknown): FinanceMovement {
	const row = record(value);
	const metadata = record(row.metadata);
	const reconciled =
		row.status === 'pending' &&
		(row.event_type === 'transparent.reconciled_paid' ||
			(row.event_type === 'transparent.completed' && ['PAID', 'APPROVED'].includes(String(metadata.provider_status))));
	const status = reconciled ? 'succeeded' : (text(row.status) ?? 'pending');
	const settled = row.status === 'succeeded';
	return {
		id: String(row.id),
		date_created: text(row.date_created),
		status,
		settlement_status: settled ? 'settled' : status === 'succeeded' ? 'pending' : 'not_applicable',
		provider: text(row.provider),
		event_type: text(row.event_type),
		provider_object_id: text(row.provider_object_id),
		provider_event_id: text(row.provider_event_id),
		provider_status: text(metadata.provider_status),
		amount: number(row.amount),
		provider_fee: settled ? number(row.provider_fee) : null,
		platform_fee: settled ? number(row.platform_fee) : null,
		organizer_net: settled ? number(row.organizer_net) : null,
	};
}
export function presentFinanceTransaction(value: unknown) {
	const row = record(value);
	const { additional_info: _info, ...registration } = record(row.registration_id);
	return { ...presentMovement(row), registration_id: registration };
}
export function presentTransactionDetails(
	value: unknown,
	installments: unknown[],
	tickets: unknown[],
	movements: unknown[],
): FinanceTransactionDetails {
	const row = record(value);
	const r = record(row.registration_id);
	const info = record(r.additional_info);
	const event = record(r.event_id);
	const ticketType = record(r.ticket_type_id);
	return {
		transaction: presentMovement(row),
		registration: {
			id: String(r.id),
			status: text(r.status),
			payment_status: text(r.payment_status),
			payment_method: text(r.payment_method),
			participant_name: text(r.participant_name),
			participant_email: text(r.participant_email),
			participant_phone: text(r.participant_phone),
			participant_document: text(r.participant_document),
			quantity: number(r.quantity) ?? 0,
			unit_price: number(r.unit_price),
			service_fee: number(r.service_fee),
			total_amount: number(r.total_amount),
			payment_amount: number(r.payment_amount),
			is_installment_payment: r.is_installment_payment === true,
			total_installments: number(r.total_installments),
			installment_plan_status: text(r.installment_plan_status),
			card_installments: number(info.card_installments),
			checkout_group_id: text(info.checkout_group_id),
			date_created: text(r.date_created),
			date_updated: text(r.date_updated),
			cancelled_at: text(r.cancelled_at),
			cancelled_reason: text(r.cancelled_reason),
			provider_checkout_id: text(r.provider_checkout_id),
			provider_refund_id: text(r.provider_refund_id),
			receipt_url: text(r.receipt_url),
			notes: text(r.notes),
		},
		event: {
			id: String(event.id),
			title: text(event.title),
			slug: text(event.slug),
			start_date: text(event.start_date),
			end_date: text(event.end_date),
			location_name: text(event.location_name),
			location_address: text(event.location_address),
			event_type: text(event.event_type),
		},
		ticket_type: ticketType.id ? { id: String(ticketType.id), title: text(ticketType.title) } : null,
		installments: installments
			.map((value) => {
				const i = record(value);
				return {
					id: String(i.id),
					installment_number: number(i.installment_number) ?? 0,
					total_installments: number(i.total_installments) ?? 0,
					amount: number(i.amount) ?? 0,
					status: text(i.status) ?? 'pending',
					due_date: text(i.due_date),
					paid_at: text(i.paid_at),
					payment_confirmed_at: text(i.payment_confirmed_at),
					provider_transaction_id: text(i.provider_transaction_id),
				};
			})
			.sort((a, b) => a.installment_number - b.installment_number),
		tickets: tickets.map((value) => {
			const t = record(value);
			return {
				id: String(t.id),
				sequence: number(t.sequence) ?? 0,
				ticket_code: text(t.ticket_code),
				attendee_name: text(t.attendee_name),
				attendee_email: text(t.attendee_email),
				is_buyer: t.is_buyer === true,
				check_in_date: text(t.check_in_date),
				named_at: text(t.named_at),
				unit_price: number(t.unit_price),
				service_fee: number(t.service_fee),
				discount: number(t.discount),
				total_amount: number(t.total_amount),
			};
		}),
		movements: movements.map(presentMovement),
	};
}
