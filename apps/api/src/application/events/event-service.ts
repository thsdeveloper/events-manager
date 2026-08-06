import { eventInputSchema, type Event, type EventInput } from '@events-manager/contracts';

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

export class EventNotFound extends Error {}
export class OrganizerRequired extends Error {}

export class EventService {
	constructor(private readonly repository: EventRepository) {}

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

	async create(userId: string, input: EventInput) {
		const event = await this.repository.createForUser(userId, input);
		if (event === 'organizer_required') throw new OrganizerRequired();
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
