import type { NominalTicket } from '@events-manager/contracts';

/**
 * Projeção de um ingresso nominal com o pedido, o evento e o tipo. Usada pela
 * área da pessoa e pelo painel do organizador, para que os dois falem a mesma
 * forma (`NominalTicket`). O perfil de quem comprou não entra: `user_id`
 * aponta para `auth.users`, sem chave estrangeira para `profiles`, e o
 * PostgREST não consegue embutir a relação.
 */
export const nominalTicketSelection = `
  id,
  sequence,
  ticket_code,
  attendee_name,
  attendee_email,
  attendee_phone,
  attendee_document,
  is_buyer,
  named_at,
  unit_price,
  service_fee,
  discount,
  total_amount,
  check_in_date,
  date_created,
  date_updated,
  registration:event_registrations!inner(
    id,user_id,participant_name,participant_email,participant_phone,participant_document,
    status,payment_status,payment_method,total_amount,quantity,receipt_url,notes,date_created,cancelled_at,additional_info,is_installment_payment,total_installments,installment_plan_status
  ),
  event:events!inner(
    id,title,slug,start_date,end_date,location_name,location_address,event_type,online_url,organizer_id,
    cover_image:media_files(*)
  ),
  ticket_type:event_tickets(id,title,price,description)
`;

export function mapNominalTicket(row: Record<string, unknown>): NominalTicket {
	const { additional_info, ...registration } = row.registration as NominalTicket['registration'] & {
		additional_info?: Record<string, unknown>;
	};
	const metadata = additional_info ?? {};
	const money = (value: unknown) => Number(value ?? 0);

	return {
		id: String(row.id),
		sequence: Number(row.sequence),
		ticket_code: String(row.ticket_code),
		attendee_name: (row.attendee_name as string | null) ?? null,
		attendee_email: (row.attendee_email as string | null) ?? null,
		attendee_phone: (row.attendee_phone as string | null) ?? null,
		attendee_document: (row.attendee_document as string | null) ?? null,
		is_buyer: Boolean(row.is_buyer),
		named_at: (row.named_at as string | null) ?? null,
		unit_price: money(row.unit_price),
		service_fee: money(row.service_fee),
		discount: money(row.discount),
		total_amount: money(row.total_amount),
		check_in_date: (row.check_in_date as string | null) ?? null,
		date_created: String(row.date_created),
		date_updated: String(row.date_updated),
		registration: {
			...registration,
			payment_method:
				registration.payment_method ??
				(['PIX', 'CARD', 'BOLETO'].includes(String(metadata.payment_method_requested))
					? String(metadata.payment_method_requested).toLowerCase()
					: null),
			checkout_group_id: typeof metadata.checkout_group_id === 'string' ? metadata.checkout_group_id : null,
			card_installments: typeof metadata.card_installments === 'number' ? metadata.card_installments : null,
			total_amount: registration.total_amount === null ? null : Number(registration.total_amount),
			user: registration.user ?? null,
		},
		event: row.event as NominalTicket['event'],
		ticket_type: (row.ticket_type as NominalTicket['ticket_type']) ?? null,
	};
}
