import { ticketInputSchema, type TicketInput } from '@events-manager/contracts';
import { ApiError } from '../../shared/errors.js';

export interface AdminTicket extends Record<string, unknown> {
	buyer_price?: number | null;
	date_created?: string;
	date_updated?: string;
	event_id: { id: string; organizer_id: string } | string;
	id: string;
	price: number;
	provider_product_id?: string | null;
	quantity_sold?: number;
	service_fee_type: string;
	title: string;
}

export interface ParticipantQuery {
	eventIds?: string;
	hasCheckedIn?: 'true' | 'false';
	limit: number;
	page: number;
	paymentStatus?: string;
	registrationStatus?: string;
	search: string;
	sortDirection: 'asc' | 'desc';
	sortField: string;
	ticketTypeIds?: string;
}

export interface TicketQuery {
	eventIds?: string;
	page: number;
	search: string;
	status?: string;
}

export interface AdminRepository {
	cancelRegistration(organizerId: string, id: string, reason: string): Promise<unknown | null>;
	createTicket(input: TicketInput & { buyer_price: number; quantity_sold: number; sort: number }): Promise<unknown>;
	deleteTicket(id: string): Promise<void>;
	duplicateTicket(input: Record<string, unknown>): Promise<unknown>;
	findOwnedRegistration(organizerId: string, id: string): Promise<unknown | null>;
	findTicket(id: string): Promise<AdminTicket | null>;
	getConfiguration(): Promise<unknown>;
	getPlatformFeePercentage(): Promise<number>;
	listEventOptions(organizerId: string): Promise<unknown[]>;
	listOwnedEventIds(organizerId: string): Promise<string[]>;
	listParticipantFilterOptions(eventIds: string[]): Promise<{ events: unknown[]; ticketTypes: unknown[] }>;
	listParticipants(
		eventIds: string[],
		query: ParticipantQuery,
	): Promise<{
		data: unknown[];
		metricRows: Array<{ check_in_date: string | null; status: string | null }>;
		total: number;
	}>;
	listTickets(eventIds: string[], query: TicketQuery): Promise<{ data: unknown[]; total: number }>;
	updateRegistration(id: string, input: Record<string, unknown>): Promise<unknown>;
	updateTicket(id: string, input: Record<string, unknown>): Promise<unknown>;
}

export class AdminService {
	constructor(
		private readonly repository: AdminRepository,
		private readonly now: () => Date = () => new Date(),
	) {}

	getConfiguration() {
		return this.repository.getConfiguration();
	}

	async eventFilterOptions(organizerId: string) {
		return { events: await this.repository.listEventOptions(organizerId) };
	}

	async listTickets(organizerId: string, query: TicketQuery) {
		const ownedIds = await this.repository.listOwnedEventIds(organizerId);
		const requested = query.eventIds?.split(',').filter(Boolean);
		const eventIds = requested?.length ? requested.filter((id) => ownedIds.includes(id)) : ownedIds;
		if (!eventIds.length) return emptyTicketPage(query.page);
		const result = await this.repository.listTickets(eventIds, query);
		return {
			data: result.data,
			meta: {
				total: result.total,
				page: query.page,
				pageCount: Math.ceil(result.total / 20),
				perPage: 20,
			},
		};
	}

	async createTicket(organizerId: string, input: TicketInput) {
		const ownedIds = await this.repository.listOwnedEventIds(organizerId);
		if (!ownedIds.includes(input.event_id)) {
			throw new ApiError('Evento não encontrado ou sem permissão.', 403, 'FORBIDDEN');
		}
		return this.repository.createTicket({
			...input,
			buyer_price: await this.buyerPrice(input.price, input.service_fee_type),
			quantity_sold: 0,
			sort: 0,
		});
	}

	async updateTicket(organizerId: string, id: string, input: Partial<TicketInput>) {
		const current = await this.ownedTicket(organizerId, id);
		const eventId = eventRelation(current).id;
		ticketInputSchema.parse({ ...current, ...input, event_id: eventId });
		const price = input.price ?? Number(current.price);
		const feeType = input.service_fee_type ?? current.service_fee_type;
		const productChanged =
			input.price !== undefined || input.service_fee_type !== undefined || input.title !== undefined;
		return this.repository.updateTicket(id, {
			...input,
			buyer_price: await this.buyerPrice(price, feeType),
			...(productChanged ? { provider_product_id: null } : {}),
		});
	}

	async deleteTicket(organizerId: string, id: string) {
		await this.ownedTicket(organizerId, id);
		await this.repository.deleteTicket(id);
	}

	async duplicateTicket(organizerId: string, id: string) {
		const current = await this.ownedTicket(organizerId, id);
		const ownedEvent = eventRelation(current);
		const {
			event_id: ignoredEvent,
			id: ignoredId,
			date_created: ignoredCreated,
			date_updated: ignoredUpdated,
			provider_product_id: ignoredProduct,
			...copy
		} = current;
		return this.repository.duplicateTicket({
			...copy,
			provider_product_id: null,
			event_id: ownedEvent.id,
			title: `${current.title} - Cópia`,
			status: 'inactive',
			quantity_sold: 0,
		});
	}

	async participantFilterOptions(organizerId: string) {
		return this.repository.listParticipantFilterOptions(await this.repository.listOwnedEventIds(organizerId));
	}

	async listParticipants(organizerId: string, query: ParticipantQuery) {
		const ownedIds = await this.repository.listOwnedEventIds(organizerId);
		const requested = query.eventIds?.split(',').filter((id) => ownedIds.includes(id));
		const eventIds = requested?.length ? requested : ownedIds;
		if (!eventIds.length) return emptyParticipantPage(query.page, query.limit);
		const result = await this.repository.listParticipants(eventIds, query);
		const checkedIn = result.metricRows.filter((row) => row.check_in_date).length;
		const pending = result.metricRows.filter((row) => row.status === 'pending').length;
		return {
			data: result.data,
			meta: {
				total: result.total,
				page: query.page,
				limit: query.limit,
				pageCount: Math.ceil(result.total / query.limit),
			},
			metrics: {
				total: result.metricRows.length,
				checkedIn,
				pending,
				checkInRate: result.metricRows.length ? (checkedIn / result.metricRows.length) * 100 : 0,
			},
		};
	}

	async getParticipant(organizerId: string, id: string) {
		const data = await this.repository.findOwnedRegistration(organizerId, id);
		if (!data) throw registrationNotFound();
		return { success: true, data };
	}

	async editParticipant(organizerId: string, id: string, input: Record<string, unknown>) {
		await this.assertRegistration(organizerId, id);
		return { success: true, data: await this.repository.updateRegistration(id, input) };
	}

	async checkIn(organizerId: string, id: string) {
		await this.assertRegistration(organizerId, id);
		return {
			success: true,
			data: await this.repository.updateRegistration(id, {
				status: 'checked_in',
				check_in_date: this.now().toISOString(),
			}),
		};
	}

	async undoCheckIn(organizerId: string, id: string) {
		await this.assertRegistration(organizerId, id);
		return {
			success: true,
			data: await this.repository.updateRegistration(id, { status: 'confirmed', check_in_date: null }),
		};
	}

	async cancelParticipant(organizerId: string, id: string, reason: string) {
		const data = await this.repository.cancelRegistration(organizerId, id, reason);
		if (!data) throw registrationNotFound();
		return { success: true, data };
	}

	async exportParticipants(organizerId: string) {
		const eventIds = await this.repository.listOwnedEventIds(organizerId);
		const result = eventIds.length
			? await this.repository.listParticipants(eventIds, {
					page: 1,
					limit: 10_000,
					search: '',
					sortField: 'date_created',
					sortDirection: 'desc',
				})
			: { data: [] };
		return `\uFEFF${[
			'Nome,Email,Telefone,Evento,Ingresso,Status,Pagamento,Check-in',
			...result.data.map((value) => {
				const row = value as Record<string, unknown> & {
					event_id?: { title?: string };
					ticket_type_id?: { title?: string };
				};
				return [
					row.participant_name,
					row.participant_email,
					row.participant_phone,
					row.event_id?.title,
					row.ticket_type_id?.title,
					row.status,
					row.payment_status,
					row.check_in_date,
				]
					.map(csvCell)
					.join(',');
			}),
		].join('\n')}`;
	}

	private async ownedTicket(organizerId: string, id: string) {
		const ticket = await this.repository.findTicket(id);
		if (!ticket || eventRelation(ticket).organizer_id !== organizerId) {
			throw new ApiError('Ingresso não encontrado.', 404, 'TICKET_NOT_FOUND');
		}
		return ticket;
	}

	private async buyerPrice(price: number, feeType: string) {
		const fee = await this.repository.getPlatformFeePercentage();
		return feeType === 'passed_to_buyer' ? price * (1 + fee / 100) : price;
	}

	private async assertRegistration(organizerId: string, id: string) {
		if (!(await this.repository.findOwnedRegistration(organizerId, id))) throw registrationNotFound();
	}
}

function eventRelation(ticket: AdminTicket) {
	return ticket.event_id as { id: string; organizer_id: string };
}

function registrationNotFound() {
	return new ApiError('Inscrição não encontrada ou sem permissão.', 404, 'REGISTRATION_NOT_FOUND');
}

function emptyTicketPage(page: number) {
	return { data: [], meta: { total: 0, page, pageCount: 0, perPage: 20 } };
}

function emptyParticipantPage(page: number, limit: number) {
	return {
		data: [],
		meta: { total: 0, page, limit, pageCount: 0 },
		metrics: { total: 0, checkedIn: 0, pending: 0, checkInRate: 0 },
	};
}

function csvCell(value: unknown) {
	return `"${String(value ?? '').replaceAll('"', '""')}"`;
}
