import {
	eventInputSchema,
	type Event,
	type EventCreateInput,
	type EventInput,
	type TicketInput,
	sanitizeHtml,
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

interface CategoryOrder {
	name?: string | null;
	sort?: number | null;
}

/** Sem `sort`, a categoria vai para o fim da fila em vez de para o começo. */
function compareCategories(left: CategoryOrder, right: CategoryOrder) {
	const leftSort = left.sort ?? Number.POSITIVE_INFINITY;
	const rightSort = right.sort ?? Number.POSITIVE_INFINITY;
	if (leftSort !== rightSort) return leftSort - rightSort;

	return (left.name ?? '').localeCompare(right.name ?? '', 'pt-BR');
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
		// A landing page do organizador só sai quando ligada, e nunca o rascunho.
		const page = (event as { page?: { enabled?: boolean; published?: unknown } | null }).page;
		event.page = page?.enabled && page.published ? (page.published as Event['page']) : null;
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

	/**
	 * O catálogo sai na ordem que o super admin arrumou: primeiro o `sort` que
	 * ele definiu, e as categorias sem posição no fim, em ordem alfabética. A
	 * ordenação fica aqui, e não só no SQL, para que o organizador veja a mesma
	 * sequência do painel do super admin venha ela de onde vier.
	 */
	async listCategories() {
		const categories = (await this.repository.listCategories()) as CategoryOrder[];
		return [...categories].sort(compareCategories);
	}

	async create(userId: string, input: EventCreateInput) {
		const { tickets, ...eventInput } = input;
		const ticketCreator = this.ticketCreator;
		if (tickets.length > 0 && !ticketCreator) {
			throw new Error('EventService was built without a ticket creator.');
		}
		// A published event cannot become visible while its tickets are still saving.
		const publishWhenReady = eventInput.status === 'published' && tickets.length > 0;
		const event = await this.repository.createForUser(
			userId,
			withSafeDescription(publishWhenReady ? { ...eventInput, status: 'draft' } : eventInput),
		);
		if (event === 'organizer_required') throw new OrganizerRequired();
		if (tickets.length === 0) return event;

		const { id, organizer_id: organizerId } = event as { id: string; organizer_id: string };
		try {
			for (const ticket of tickets) {
				await ticketCreator!.create(organizerId, { ...ticket, event_id: id });
			}
			if (publishWhenReady) {
				const published = await this.repository.updateForUser(userId, id, { status: 'published' });
				if (!published) throw new EventNotFound();
				return published;
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

	/**
	 * O patch é validado contra o evento completo, para que uma mudança parcial
	 * (só o status, por exemplo) ainda respeite as regras de datas. O evento vem
	 * do repositório com as relações embutidas como objetos; o schema espera ids.
	 */
	async update(userId: string, id: string, patch: Partial<EventInput>) {
		const current = await this.getForUser(userId, id);
		eventInputSchema.parse({ ...flattenRelations(current), ...patch });
		const event = await this.repository.updateForUser(userId, id, withSafeDescription(patch));
		if (!event) throw new EventNotFound();
		return event;
	}

	async delete(userId: string, id: string) {
		if (!(await this.repository.deleteForUser(userId, id))) throw new EventNotFound();
	}
}

const RELATION_FIELDS = ['category_id', 'cover_image', 'organizer_id'] as const;

/** Troca cada relação embutida pelo id que o schema de entrada valida. */
function flattenRelations(event: Event): Record<string, unknown> {
	const flat: Record<string, unknown> = { ...event };
	for (const field of RELATION_FIELDS) {
		const value = flat[field];
		if (value && typeof value === 'object' && 'id' in value) flat[field] = (value as { id: string }).id;
	}

	return flat;
}

/**
 * A descrição vem do editor de texto livre como HTML. Sanitizar na gravação
 * (como o CMS faz) garante que nenhum script chegue ao banco, seja qual for o
 * cliente que enviou.
 */
function withSafeDescription<T extends { description?: string | null }>(input: T): T {
	if (typeof input.description !== 'string') return input;

	return { ...input, description: sanitizeHtml(input.description) };
}
