import type { EventRegistration, NominalTicket } from '@events-manager/contracts';

/**
 * Cada linha do painel é um ingresso nominal: quem vai, quem comprou (o
 * pedido), o evento e o tipo. A API devolve a mesma forma na lista e no detalhe.
 */
export type ParticipantRow = NominalTicket;
export type ParticipantDetails = NominalTicket;

// Filtros disponíveis
export interface ParticipantFilters {
	search: string;
	eventIds: string[];
	ticketTypeIds: string[];
	registrationStatus: EventRegistration['status'][];
	paymentStatus: EventRegistration['payment_status'][];
	hasCheckedIn: boolean | null;
	checkInDateRange: {
		start: string | null;
		end: string | null;
	};
}

// Configuração de ordenação
export interface SortConfig {
	field: string;
	direction: 'asc' | 'desc';
}

// Estado da tabela
export interface ParticipantTableState {
	sorting: SortConfig;
	pagination: {
		page: number;
		limit: number;
	};
	filters: ParticipantFilters;
}

/** Dados do participante de um ingresso, como o organizador os edita. */
export interface EditParticipantData {
	participant_name: string;
	participant_email: string;
	participant_phone?: string;
	participant_document?: string;
	/** Observações internas: pertencem ao pedido, não ao ingresso. */
	notes?: string;
}

// Dados para cancelamento de inscrição
export interface CancelRegistrationData {
	reason: string;
}

// Métricas do dashboard
export interface ParticipantMetrics {
	total: number;
	checkedIn: number;
	pending: number;
	checkInRate: number;
}

// Resposta da API
export interface ParticipantsResponse {
	data: ParticipantRow[];
	meta: {
		total: number;
		page: number;
		limit: number;
		pageCount: number;
	};
	metrics: ParticipantMetrics;
}
