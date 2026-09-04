import { ticketInputSchema } from '@events-manager/contracts';
import { ApiError } from '../../shared/errors.js';
export class AdminService {
    repository;
    now;
    constructor(repository, now = () => new Date()) {
        this.repository = repository;
        this.now = now;
    }
    getConfiguration() {
        return this.repository.getConfiguration();
    }
    async eventFilterOptions(organizerId) {
        return { events: await this.repository.listEventOptions(organizerId) };
    }
    async listTickets(organizerId, query) {
        const ownedIds = await this.repository.listOwnedEventIds(organizerId);
        const requested = query.eventIds?.split(',').filter(Boolean);
        const eventIds = requested?.length ? requested.filter((id) => ownedIds.includes(id)) : ownedIds;
        if (!eventIds.length)
            return emptyTicketPage(query.page);
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
    async createTicket(organizerId, input) {
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
    async updateTicket(organizerId, id, input) {
        const current = await this.ownedTicket(organizerId, id);
        const eventId = eventRelation(current).id;
        ticketInputSchema.parse({ ...current, ...input, event_id: eventId });
        const price = input.price ?? Number(current.price);
        const feeType = input.service_fee_type ?? current.service_fee_type;
        const productChanged = input.price !== undefined || input.service_fee_type !== undefined || input.title !== undefined;
        return this.repository.updateTicket(id, {
            ...input,
            buyer_price: await this.buyerPrice(price, feeType),
            ...(productChanged ? { provider_product_id: null } : {}),
        });
    }
    async deleteTicket(organizerId, id) {
        await this.ownedTicket(organizerId, id);
        await this.repository.deleteTicket(id);
    }
    async duplicateTicket(organizerId, id) {
        const current = await this.ownedTicket(organizerId, id);
        const ownedEvent = eventRelation(current);
        const { event_id: ignoredEvent, id: ignoredId, date_created: ignoredCreated, date_updated: ignoredUpdated, provider_product_id: ignoredProduct, ...copy } = current;
        return this.repository.duplicateTicket({
            ...copy,
            provider_product_id: null,
            event_id: ownedEvent.id,
            title: `${current.title} - Cópia`,
            status: 'inactive',
            quantity_sold: 0,
        });
    }
    async participantFilterOptions(organizerId) {
        return this.repository.listParticipantFilterOptions(await this.repository.listOwnedEventIds(organizerId));
    }
    async listParticipants(organizerId, query) {
        const ownedIds = await this.repository.listOwnedEventIds(organizerId);
        const requested = query.eventIds?.split(',').filter((id) => ownedIds.includes(id));
        const eventIds = requested?.length ? requested : ownedIds;
        if (!eventIds.length)
            return emptyParticipantPage(query.page, query.limit);
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
    async getParticipant(organizerId, id) {
        const data = await this.repository.findOwnedRegistration(organizerId, id);
        if (!data)
            throw registrationNotFound();
        return { success: true, data };
    }
    async editParticipant(organizerId, id, input) {
        await this.assertRegistration(organizerId, id);
        return { success: true, data: await this.repository.updateRegistration(id, input) };
    }
    async checkIn(organizerId, id) {
        await this.assertRegistration(organizerId, id);
        return {
            success: true,
            data: await this.repository.updateRegistration(id, {
                status: 'checked_in',
                check_in_date: this.now().toISOString(),
            }),
        };
    }
    async undoCheckIn(organizerId, id) {
        await this.assertRegistration(organizerId, id);
        return {
            success: true,
            data: await this.repository.updateRegistration(id, { status: 'confirmed', check_in_date: null }),
        };
    }
    async cancelParticipant(organizerId, id, reason) {
        const data = await this.repository.cancelRegistration(organizerId, id, reason);
        if (!data)
            throw registrationNotFound();
        return { success: true, data };
    }
    async exportParticipants(organizerId) {
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
                const row = value;
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
    async ownedTicket(organizerId, id) {
        const ticket = await this.repository.findTicket(id);
        if (!ticket || eventRelation(ticket).organizer_id !== organizerId) {
            throw new ApiError('Ingresso não encontrado.', 404, 'TICKET_NOT_FOUND');
        }
        return ticket;
    }
    async buyerPrice(price, feeType) {
        const fee = await this.repository.getPlatformFeePercentage();
        return feeType === 'passed_to_buyer' ? price * (1 + fee / 100) : price;
    }
    async assertRegistration(organizerId, id) {
        if (!(await this.repository.findOwnedRegistration(organizerId, id)))
            throw registrationNotFound();
    }
}
function eventRelation(ticket) {
    return ticket.event_id;
}
function registrationNotFound() {
    return new ApiError('Inscrição não encontrada ou sem permissão.', 404, 'REGISTRATION_NOT_FOUND');
}
function emptyTicketPage(page) {
    return { data: [], meta: { total: 0, page, pageCount: 0, perPage: 20 } };
}
function emptyParticipantPage(page, limit) {
    return {
        data: [],
        meta: { total: 0, page, limit, pageCount: 0 },
        metrics: { total: 0, checkedIn: 0, pending: 0, checkInRate: 0 },
    };
}
function csvCell(value) {
    return `"${String(value ?? '').replaceAll('"', '""')}"`;
}
//# sourceMappingURL=admin-service.js.map