import type { NominalTicket } from '@events-manager/contracts';

/**
 * Ingresso nominal de exemplo para os testes do painel. Vive em `_lib` porque
 * vários arquivos de teste da pasta o compartilham; não é usado em produção.
 */
export function nominalTicket(overrides: Partial<NominalTicket> = {}): NominalTicket {
	return {
		id: 't-1',
		sequence: 2,
		ticket_code: 'EVT-2',
		attendee_name: 'Bia Lima',
		attendee_email: 'bia@events.local',
		attendee_phone: null,
		attendee_document: null,
		is_buyer: false,
		named_at: '2026-09-17T12:00:00.000Z',
		unit_price: 100,
		service_fee: 10,
		discount: 0,
		total_amount: 110,
		check_in_date: null,
		date_created: '2026-09-17T12:00:00.000Z',
		date_updated: '2026-09-17T12:00:00.000Z',
		registration: {
			id: 'r-1',
			user_id: 'u-1',
			participant_name: 'Ana Souza',
			participant_email: 'ana@events.local',
			participant_phone: null,
			participant_document: null,
			status: 'confirmed',
			payment_status: 'paid',
			payment_method: 'pix',
			total_amount: 550,
			quantity: 5,
			receipt_url: null,
			notes: null,
			date_created: '2026-09-17T12:00:00.000Z',
			cancelled_at: null,
			user: { id: 'u-1', first_name: 'Ana', last_name: 'Souza', email: 'ana@events.local', avatar: null },
		},
		event: {
			id: 'e-1',
			title: 'Congresso',
			slug: 'congresso',
			start_date: '2026-09-19T12:00:00.000Z',
			end_date: null,
			location_name: 'Ginásio',
			location_address: null,
			event_type: 'in_person',
			online_url: null,
			organizer_id: 'org-1',
			cover_image: null,
		},
		ticket_type: { id: 'tt-1', title: 'Inteira', price: 100, description: null },
		...overrides,
	};
}
