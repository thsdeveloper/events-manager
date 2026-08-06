import type { EventRegistration, Event, EventTicket, AppUser } from '@events-manager/contracts';

// Tipo expandido com relações
export interface ParticipantRow extends Omit<EventRegistration, 'event_id' | 'ticket_type_id' | 'user_id'> {
	event_id: {
		id: string;
		title: string;
		slug: string;
		start_date: string;
		location_name: string | null;
		organizer_id: string;
	};
	ticket_type_id: {
		id: string;
		title: string;
		price: number;
	} | null;
	user_id: {
		id: string;
		first_name: string | null;
		last_name: string | null;
		email: string | null;
		avatar: string | null;
	} | null;
}

// Tipo completo para detalhes do participante
export interface ParticipantDetails extends Omit<ParticipantRow, 'event_id' | 'ticket_type_id'> {
	event_id: {
		id: string;
		title: string;
		slug: string;
		start_date: string;
		end_date: string | null;
		location_name: string | null;
		location_address: string | null;
		organizer_id: string;
	};
	ticket_type_id: {
		id: string;
		title: string;
		price: number;
		description: string | null;
	} | null;
	user_id: {
		id: string;
		first_name: string | null;
		last_name: string | null;
		email: string | null;
		avatar: string | null;
	} | null;
}

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

// Dados para edição de participante
export interface EditParticipantData {
	participant_name: string;
	participant_email: string;
	participant_phone?: string;
	participant_document?: string;
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
