import type { NominalTicket } from '@events-manager/contracts';

const paymentNotices = {
	pending: {
		kind: 'pending',
		label: 'Aguardando pagamento',
		message: 'O ingresso, o QR Code e o PDF serão liberados após a confirmação do pagamento.',
	},
	cancelled: {
		kind: 'cancelled',
		label: 'Cancelado',
		message: 'Este pedido foi cancelado. O ingresso não é válido para entrada no evento.',
	},
	refunded: {
		kind: 'refunded',
		label: 'Reembolsado',
		message: 'Este pagamento foi reembolsado. O ingresso não é válido para entrada no evento.',
	},
} as const;

/** A reserva e a nomeação não comprovam pagamento: somente paid/free liberam o ingresso. */
export function getTicketAccess(ticket: NominalTicket) {
	const registration = ticket.registration;
	const notice =
		registration.payment_status === 'refunded'
			? paymentNotices.refunded
			: registration.status === 'cancelled'
				? paymentNotices.cancelled
				: registration.payment_status !== 'paid' && registration.payment_status !== 'free'
					? paymentNotices.pending
					: null;
	const paymentConfirmed = notice === null;

	return {
		paymentConfirmed,
		canUseTicket: paymentConfirmed && Boolean(ticket.attendee_name?.trim() && ticket.attendee_email?.trim()),
		notice,
	};
}
