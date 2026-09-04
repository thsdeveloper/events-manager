import { eventInputSchema, } from '@events-manager/contracts';
export class EventNotFound extends Error {
}
export class OrganizerRequired extends Error {
}
export class EventService {
    repository;
    ticketCreator;
    constructor(repository, ticketCreator) {
        this.repository = repository;
        this.ticketCreator = ticketCreator;
    }
    async getPublicBySlug(slug) {
        const event = await this.repository.findPublicBySlug(slug);
        if (!event)
            throw new EventNotFound();
        if (Array.isArray(event.tickets)) {
            event.tickets.sort((left, right) => typeof left === 'string' || typeof right === 'string' ? 0 : (left.sort ?? 0) - (right.sort ?? 0));
        }
        return event;
    }
    listForUser(userId) {
        return this.repository.listForUser(userId);
    }
    async listPublic(query) {
        const result = await this.repository.listPublic(query);
        return {
            data: result.data,
            pagination: {
                limit: query.limit,
                page: query.page,
                pageCount: Math.ceil(result.total / query.limit),
                total: result.total,
            },
        };
    }
    listCategories() {
        return this.repository.listCategories();
    }
    async create(userId, input) {
        const { tickets, ...eventInput } = input;
        const event = await this.repository.createForUser(userId, eventInput);
        if (event === 'organizer_required')
            throw new OrganizerRequired();
        if (tickets.length === 0)
            return event;
        if (!this.ticketCreator)
            throw new Error('EventService was built without a ticket creator.');
        const { id, organizer_id: organizerId } = event;
        try {
            for (const ticket of tickets) {
                await this.ticketCreator.create(organizerId, { ...ticket, event_id: id });
            }
        }
        catch (error) {
            // A paid event with no tickets is precisely the state the rule forbids,
            // so the half-built event is rolled back instead of being left behind.
            await this.repository.deleteForUser(userId, id).catch(() => undefined);
            throw error;
        }
        return event;
    }
    async getForUser(userId, id) {
        const event = await this.repository.findForUser(userId, id);
        if (!event)
            throw new EventNotFound();
        return event;
    }
    async update(userId, id, patch) {
        const current = await this.getForUser(userId, id);
        eventInputSchema.parse({ ...current, ...patch });
        const event = await this.repository.updateForUser(userId, id, patch);
        if (!event)
            throw new EventNotFound();
        return event;
    }
    async delete(userId, id) {
        if (!(await this.repository.deleteForUser(userId, id)))
            throw new EventNotFound();
    }
}
//# sourceMappingURL=event-service.js.map