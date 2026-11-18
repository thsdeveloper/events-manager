import { calculateUnitBuyerPrice, calculateUnitPlatformFee } from '@events-manager/contracts';
import { ticketInputSchema, type NominalTicket, type TicketInput } from '@events-manager/contracts';
import { ApiError } from '../../shared/errors.js';
import { csvCell } from '../security/csv.js';
import type { RefundableRegistration } from '../payments/refund-registration.js';
import type { TicketDelivery } from '../tickets/deliver-tickets.js';

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

/** Dados do participante de um ingresso, como o organizador os edita. */
export interface ParticipantInput {
	notes?: string | null;
	participant_document?: string | null;
	participant_email: string;
	participant_name: string;
	participant_phone?: string | null;
}

export interface ParticipantTicketPage {
	data: NominalTicket[];
	metricRows: Array<{ check_in_date: string | null; registration_status: string | null }>;
	total: number;
}

/**
 * Porta do reembolso. O cancelamento pelo organizador pode devolver o dinheiro
 * pelo provedor; quem sabe estornar é o caso de uso de pagamentos.
 */
export interface RegistrationRefunder {
	execute(registration: RefundableRegistration, reason: string): Promise<{ refundIds: string[] }>;
}

export interface AdminRepository {
	cancelRegistration(organizerId: string, id: string, reason: string): Promise<unknown | null>;
	createTicket(input: TicketInput & { buyer_price: number; quantity_sold: number; sort: number }): Promise<unknown>;
	deleteTicket(id: string): Promise<void>;
	duplicateTicket(input: Record<string, unknown>): Promise<unknown>;
	findOwnedRegistration(organizerId: string, id: string): Promise<unknown | null>;
	/** Um ingresso nominal de um evento deste organizador, ou `null`. */
	findOwnedTicket(organizerId: string, id: string): Promise<NominalTicket | null>;
	findTicket(id: string): Promise<AdminTicket | null>;
	getConfiguration(): Promise<unknown>;
	getPlatformFeePercentage(): Promise<number>;
	nextTicketSort?(eventId: string): Promise<number>;
	groupBelongsToEvent?(groupId: string, eventId: string): Promise<boolean>;
	listEventOptions(organizerId: string): Promise<Array<{ id: string; title: string }>>;
	listOwnedEventIds(organizerId: string): Promise<string[]>;
	listParticipantFilterOptions(eventIds: string[]): Promise<{ events: unknown[]; ticketTypes: unknown[] }>;
	/** Uma linha por ingresso nominal, com pedido, evento e tipo. */
	listParticipantTickets(eventIds: string[], query: ParticipantQuery): Promise<ParticipantTicketPage>;
	listTickets(eventIds: string[], query: TicketQuery): Promise<{ data: unknown[]; total: number }>;
	updateRegistration(id: string, input: Record<string, unknown>): Promise<unknown>;
	/** Atualiza um ingresso nominal (participante ou check-in). */
	updateRegistrationTicket(id: string, input: Record<string, unknown>): Promise<NominalTicket>;
	updateTicket(id: string, input: Record<string, unknown>): Promise<unknown>;
}

export class AdminService {
	constructor(
		private readonly repository: AdminRepository,
		private readonly refunds?: RegistrationRefunder,
		private readonly now: () => Date = () => new Date(),
		private readonly ticketDelivery?: TicketDelivery,
	) {}

	getConfiguration() {
		return this.repository.getConfiguration();
	}

	async eventFilterOptions(organizerId: string, eventId?: string) {
		const events = await this.repository.listEventOptions(organizerId);
		return { events: eventId ? events.filter((event) => event.id === eventId) : events };
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
		await this.assertTicketGroup(input.group_id, input.event_id);
		return this.repository.createTicket({
			...input,
			buyer_price: await this.buyerPrice(input.price, input.service_fee_type),
			quantity_sold: 0,
			sort: this.repository.nextTicketSort ? await this.repository.nextTicketSort(input.event_id) : 0,
		});
	}

	async updateTicket(organizerId: string, id: string, input: Partial<TicketInput>) {
		const current = await this.ownedTicket(organizerId, id);
		const eventId = eventRelation(current).id;
		ticketInputSchema.parse({ ...current, ...input, event_id: eventId });
		if (input.event_id && input.event_id !== eventId)
			throw new ApiError('O ingresso não pode ser movido para outro evento.', 422, 'INVALID_TICKET_EVENT');
		await this.assertTicketGroup(input.group_id, eventId);
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
		const current = await this.ownedTicket(organizerId, id);
		if (Number(current.quantity_sold ?? 0) > 0)
			throw new ApiError(
				'Este ingresso possui vendas ou reservas. Desative-o para preservar os pedidos.',
				409,
				'TICKET_HAS_ORDERS',
			);
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
			sort: this.repository.nextTicketSort ? await this.repository.nextTicketSort(ownedEvent.id) : 0,
			buyer_price: await this.buyerPrice(Number(current.price), current.service_fee_type),
			status: 'inactive',
			quantity_sold: 0,
		});
	}

	async participantFilterOptions(organizerId: string, eventId?: string) {
		const ownedIds = await this.repository.listOwnedEventIds(organizerId);
		return this.repository.listParticipantFilterOptions(eventId ? ownedIds.filter((id) => id === eventId) : ownedIds);
	}

	async listParticipants(organizerId: string, query: ParticipantQuery) {
		const ownedIds = await this.repository.listOwnedEventIds(organizerId);
		const requested = query.eventIds?.split(',').filter((id) => ownedIds.includes(id));
		const eventIds = query.eventIds ? (requested ?? []) : ownedIds;
		if (!eventIds.length) return emptyParticipantPage(query.page, query.limit);
		const result = await this.repository.listParticipantTickets(eventIds, query);
		const checkedIn = result.metricRows.filter((row) => row.check_in_date).length;
		const pending = result.metricRows.filter((row) => row.registration_status === 'pending').length;
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

	async getParticipant(organizerId: string, id: string, eventId?: string) {
		const ticket = await this.ownedNominalTicket(organizerId, id);
		if (eventId && ticket.event.id !== eventId) throw registrationNotFound();
		return { success: true, data: ticket };
	}

	/**
	 * O participante é do ingresso; as observações são do pedido. Nomear alguém
	 * com o e-mail de quem comprou marca o ingresso como sendo dela.
	 */
	async editParticipant(organizerId: string, id: string, input: ParticipantInput) {
		const ticket = await this.ownedNominalTicket(organizerId, id);
		// Regra de negócio: depois do check-in o ingresso é imutável. Quem precisa
		// corrigir algo desfaz o check-in primeiro, e a trilha fica registrada.
		if (ticket.check_in_date)
			throw new ApiError(
				'Este ingresso já passou pelo check-in e não pode ser alterado. Desfaça o check-in para editar.',
				409,
				'TICKET_CHECKED_IN',
			);
		const data = await this.repository.updateRegistrationTicket(id, {
			attendee_name: input.participant_name,
			attendee_email: input.participant_email,
			attendee_phone: input.participant_phone || null,
			attendee_document: input.participant_document || null,
			is_buyer: sameEmail(input.participant_email, ticket.registration.participant_email),
			named_at: this.now().toISOString(),
		});
		if (input.notes !== undefined)
			await this.repository.updateRegistration(ticket.registration.id, { notes: input.notes });
		return { success: true, data };
	}

	/** Check-in é por pessoa: exige um participante nomeado e um pedido pago. */
	async checkIn(organizerId: string, id: string) {
		const ticket = await this.ownedNominalTicket(organizerId, id);
		if (!ticket.attendee_name)
			throw new ApiError('Informe o participante deste ingresso antes do check-in.', 409, 'TICKET_UNNAMED');
		if (
			ticket.registration.status === 'cancelled' ||
			!['paid', 'free'].includes(ticket.registration.payment_status ?? '')
		)
			throw new ApiError('Este ingresso não está confirmado.', 409, 'TICKET_NOT_CONFIRMED');
		return {
			success: true,
			data: await this.repository.updateRegistrationTicket(id, { check_in_date: this.now().toISOString() }),
		};
	}

	async undoCheckIn(organizerId: string, id: string) {
		await this.ownedNominalTicket(organizerId, id);
		return { success: true, data: await this.repository.updateRegistrationTicket(id, { check_in_date: null }) };
	}

	/** Reenvio pedido pelo organizador: sai com chave nova, para ir de verdade. */
	async resendTicket(organizerId: string, id: string, requestId: string) {
		const ticket = await this.ownedNominalTicket(organizerId, id);
		if (!this.ticketDelivery) throw new ApiError('Envio de e-mail indisponível.', 409, 'EMAIL_UNAVAILABLE');
		const result = await this.ticketDelivery.execute([ticket.registration.id], {
			keySuffix: requestId,
			onlyTicketId: id,
		});
		return { success: true, ...result };
	}

	/**
	 * O estorno vem antes do cancelamento: se o provedor recusar, a vaga continua
	 * da pessoa e o organizador decide o que fazer. Se o cancelamento falhar
	 * depois do estorno, o webhook `*.refunded` cancela a inscrição de qualquer
	 * jeito.
	 */
	async cancelParticipant(organizerId: string, id: string, reason: string, options: { refund?: boolean } = {}) {
		// A lista mostra ingressos; o cancelamento é do pedido inteiro. Um id de
		// pedido continua aceito, para chamadas antigas.
		const ticket = await this.repository.findOwnedTicket(organizerId, id);
		const registrationId = ticket?.registration.id ?? id;
		let refund: { refundIds: string[] } | undefined;
		if (options.refund) {
			if (!this.refunds) {
				throw new ApiError('Reembolso indisponível neste ambiente.', 409, 'REFUND_UNAVAILABLE');
			}
			const registration = await this.repository.findOwnedRegistration(organizerId, registrationId);
			if (!registration) throw registrationNotFound();
			refund = await this.refunds.execute(registration as RefundableRegistration, reason);
		}
		const data = await this.repository.cancelRegistration(organizerId, registrationId, reason);
		if (!data) throw registrationNotFound();
		return { success: true, data, ...(refund ? { refund } : {}) };
	}

	async exportParticipants(organizerId: string, query: Partial<ParticipantQuery> = {}) {
		const ownedIds = await this.repository.listOwnedEventIds(organizerId);
		const requestedIds = query.eventIds?.split(',');
		const eventIds = requestedIds ? ownedIds.filter((id) => requestedIds.includes(id)) : ownedIds;
		const result = eventIds.length
			? await this.repository.listParticipantTickets(eventIds, {
					search: '',
					sortField: 'date_created',
					sortDirection: 'desc',
					...query,
					page: 1,
					limit: 10_000,
				})
			: { data: [] as NominalTicket[] };
		return `\uFEFF${[
			'Participante,Email,Telefone,Comprador,Evento,Ingresso,Código,Status,Pagamento,Check-in',
			...result.data.map((ticket) =>
				[
					ticket.attendee_name ?? 'a informar',
					ticket.attendee_email,
					ticket.attendee_phone,
					ticket.registration.participant_name,
					ticket.event.title,
					ticket.ticket_type?.title,
					ticket.ticket_code,
					ticket.registration.status,
					ticket.registration.payment_status,
					ticket.check_in_date,
				]
					.map(csvCell)
					.join(','),
			),
		].join('\n')}`;
	}

	private async ownedTicket(organizerId: string, id: string) {
		const ticket = await this.repository.findTicket(id);
		if (!ticket || eventRelation(ticket).organizer_id !== organizerId) {
			throw new ApiError('Ingresso não encontrado.', 404, 'TICKET_NOT_FOUND');
		}
		return ticket;
	}

	private async assertTicketGroup(groupId: string | null | undefined, eventId: string) {
		if (
			groupId &&
			(!this.repository.groupBelongsToEvent || !(await this.repository.groupBelongsToEvent(groupId, eventId)))
		)
			throw new ApiError('Grupo não pertence a este evento.', 422, 'INVALID_TICKET_GROUP');
	}
	private async buyerPrice(price: number, feeType: string) {
		const config = this.repository.getConfiguration
			? ((await this.repository.getConfiguration()) as {
					platform_fee_percentage?: number;
					platform_fee_minimum?: number;
				})
			: { platform_fee_percentage: await this.repository.getPlatformFeePercentage() };
		if (price > 0 && feeType === 'absorbed' && calculateUnitPlatformFee(price, config) > price)
			throw new ApiError(
				'O preço não cobre a taxa mínima. Aumente o preço ou repasse a taxa ao comprador.',
				422,
				'TICKET_PRICE_BELOW_FEE',
			);
		return calculateUnitBuyerPrice(price, feeType, config);
	}

	private async ownedNominalTicket(organizerId: string, id: string) {
		const ticket = await this.repository.findOwnedTicket(organizerId, id);
		if (!ticket) throw new ApiError('Ingresso não encontrado ou sem permissão.', 404, 'TICKET_NOT_FOUND');
		return ticket;
	}
}

function sameEmail(left: string, right: string) {
	return left.trim().toLowerCase() === right.trim().toLowerCase();
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
