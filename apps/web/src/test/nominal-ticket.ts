import type { NominalTicket } from '@events-manager/contracts';

/**
 * Ingresso nominal de exemplo para os testes do front. Quem comprou é a Ana;
 * o ingresso, por padrão, é dela mesma e o pedido está pago.
 */
export function buildNominalTicket(overrides: Partial<NominalTicket> = {}): NominalTicket {
	return {
		id: 't-1',
		sequence: 1,
		ticket_code: 'EVT-7D5F942FFF94',
		attendee_name: 'Ana Souza',
		attendee_email: 'ana@events.local',
		attendee_phone: null,
		attendee_document: null,
		is_buyer: true,
		named_at: '2026-09-15T17:49:24.000Z',
		unit_price: 345,
		service_fee: 17.25,
		discount: 0,
		total_amount: 362.25,
		check_in_date: null,
		date_created: '2026-09-15T17:49:24.000Z',
		date_updated: '2026-09-15T17:49:24.000Z',
		can_edit_attendee: true,
		registration: {
			id: 'reg-1',
			user_id: 'u-1',
			participant_name: 'Ana Souza',
			participant_email: 'ana@events.local',
			participant_phone: null,
			participant_document: null,
			status: 'confirmed',
			payment_status: 'paid',
			payment_method: 'pix',
			total_amount: 724.5,
			quantity: 2,
			receipt_url: 'https://app.abacatepay.com/receipt/tran_RPhEkpapRnDBuQnGZH2ReFSd',
			notes: null,
			date_created: '2026-09-15T17:49:24.000Z',
			cancelled_at: null,
			user: null,
		},
		event: {
			id: 'e-1',
			title: 'Congresso',
			slug: 'congresso',
			start_date: '2099-09-19T12:00:00.000Z',
			end_date: null,
			location_name: 'Ginásio Central',
			location_address: null,
			event_type: 'in_person',
			online_url: null,
			organizer_id: 'org-1',
			cover_image: null,
		},
		ticket_type: { id: 'tt-1', title: 'Meia Entrada', price: 345, description: null },
		...overrides,
	};
}
