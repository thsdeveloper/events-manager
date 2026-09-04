import {
	eventInputSchema,
	type Event,
	type EventCreateInput,
	type EventInput,
	type TicketInput,
} from '@events-manager/contracts';

export interface EventRepository {
	createForUser(userId: string, input: EventInput): Promise<Event | 'organizer_required'>;
	deleteForUser(userId: string, id: string): Promise<boolean>;
	findForUser(userId: string, id: string): Promise<Event | null>;
	findPublicBySlug(slug: string): Promise<Event | null>;
	listCategories(): Promise<unknown[]>;
	listPublic(query: { limit: number; page: number; search: string }): Promise<{ data: unknown[]; total: number }>;
	listForUser(userId: string): Promise<Event[]>;
	updateForUser(userId: string, id: string, input: Partial<EventInput>): Promise<Event | null>;
}

/**
 * Creates the tickets that travel with a new event. Kept as a port so the event
 * service does not have to know about platform-fee pricing, which lives in the
 * admin side alongside the rest of the ticket rules.
 */
export interface EventTicketCreator {
	create(organizerId: string, ticket: TicketInput): Promise<unknown>;
}

export class EventNotFound extends Error {}
export class OrganizerRequired extends Error {}

export class EventService {
	constructor(
		private readonly repository: EventRepository,
		private readonly ticketCreator?: EventTicketCreator,
	) {}

	async getPublicBySlug(slug: string) {
		const event = await this.repository.findPublicBySlug(slug);
		if (!event) throw new EventNotFound();
		if (Array.isArray(event.tickets)) {
			event.tickets.sort((left, right) =>
				typeof left === 'string' || typeof right === 'string' ? 0 : (left.sort ?? 0) - (right.sort ?? 0),
			);
		}
		return event;
	}

	listForUser(userId: string) {
		return this.repository.listForUser(userId);
	}

	async listPublic(query: { limit: number; page: number; search: string }) {
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

	async create(userId: string, input: EventCreateInput) {
		const { tickets, ...eventInput } = input;
		const event = await this.repository.createForUser(userId, eventInput);
		if (event === 'organizer_required') throw new OrganizerRequired();
		if (tickets.length === 0) return event;
		if (!this.ticketCreator) throw new Error('EventService was built without a ticket creator.');

		const { id, organizer_id: organizerId } = event as { id: string; organizer_id: string };
		try {
			for (const ticket of tickets) {
				await this.ticketCreator.create(organizerId, { ...ticket, event_id: id });
			}
		} catch (error) {
			// A paid event with no tickets is precisely the state the rule forbids,
			// so the half-built event is rolled back instead of being left behind.
			await this.repository.deleteForUser(userId, id).catch(() => undefined);
			throw error;
		}
		return event;
	}

	async getForUser(userId: string, id: string) {
		const event = await this.repository.findForUser(userId, id);
		if (!event) throw new EventNotFound();
		return event;
	}

	async update(userId: string, id: string, patch: Partial<EventInput>) {
		const current = await this.getForUser(userId, id);
		eventInputSchema.parse({ ...current, ...patch });
		const event = await this.repository.updateForUser(userId, id, patch);
		if (!event) throw new EventNotFound();
		return event;
	}

	async delete(userId: string, id: string) {
		if (!(await this.repository.deleteForUser(userId, id))) throw new EventNotFound();
	}
}
