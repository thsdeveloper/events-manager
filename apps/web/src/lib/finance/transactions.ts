import type { TransactionRow } from './server-fetchers';
const record = (value: unknown): Record<string, unknown> =>
	value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
const text = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback);
const amount = (value: unknown) => (value == null ? null : Number(value));

/** Shared by SSR and client refreshes so per-charge amounts never become order totals. */
export function mapTransactionRow(value: unknown): TransactionRow {
	const transaction = record(value);
	const registration = record(transaction.registration_id);
	const event = record(registration.event_id);
	const confirmedFees = transaction.settlement_status === 'settled';

	return {
		id: text(transaction.id),
		date: text(transaction.date_created),
		status: text(transaction.status, 'pending'),
		transactionId: text(transaction.provider_object_id) || text(transaction.provider_event_id),
		eventTitle: text(event.title, 'Evento não informado'),
		participantName: text(registration.participant_name, '—'),
		participantEmail: text(registration.participant_email),
		quantity: Number(registration.quantity ?? 0),
		gross: Number(transaction.amount ?? registration.total_amount ?? 0),
		fee: confirmedFees ? Number(transaction.platform_fee ?? 0) + Number(transaction.provider_fee ?? 0) : null,
		net: confirmedFees ? amount(transaction.organizer_net) : null,
		paymentStatus: text(registration.payment_status, 'pending'),
		paymentIntentId: text(registration.provider_transaction_id),
		paymentMethod: text(registration.payment_method),
		settlementStatus: text(transaction.settlement_status),
	};
}
