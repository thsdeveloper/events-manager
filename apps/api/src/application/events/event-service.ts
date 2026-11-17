import {
	eventInputSchema,
	calculateUnitBuyerPrice,
	type EventTicketGroupDraft,
	type Event,
	type EventCreateInput,
	type EventInput,
	type TicketInput,
} from '@events-manager/contracts';
import { ApiError } from '../../shared/errors.js';
import { type EventDraftRepository, draftNotFound } from './event-draft-service.js';
import { sanitizeEventDescriptions } from './event-description.js';
export type EventStorageInput = EventInput & { source_draft_id?: string };
export interface EventGroupCreator {
	create(organizerId: string, eventId: string, groups: EventTicketGroupDraft[]): Promise<Record<string, string>>;
}

export interface EventRepository {
	canPublishForUser(userId: string): Promise<boolean>;
	getFeeConfiguration(): Promise<{ platform_fee_percentage: number; platform_fee_minimum: number }>;
	createForUser(userId: string, input: EventStorageInput): Promise<Event | 'organizer_required'>;
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
		private readonly drafts?: EventDraftRepository,
		private readonly groups?: EventGroupCreator,
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
		if (event.tickets?.some((ticket) => typeof ticket !== 'string' && ticket.price != null)) {
			const fees = await this.repository.getFeeConfiguration();
			for (const ticket of event.tickets) {
				if (typeof ticket !== 'string' && ticket.price != null)
					ticket.buyer_price = calculateUnitBuyerPrice(
						Number(ticket.price),
						ticket.service_fee_type ?? 'passed_to_buyer',
						fees,
					);
			}
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
		const { tickets, draft_id, ticket_groups = [], ...eventInput } = input;
		if (draft_id) {
			if (!this.drafts) throw new Error('EventService was built without a draft repository.');
			const snapshot = await this.drafts.findForUser(userId, draft_id);
			if (!snapshot) throw draftNotFound();
			if (snapshot.event_id) return this.getForUser(userId, snapshot.event_id);
		}
		if (eventInput.status === 'published') await this.assertCanPublish(userId);
		const ticketCreator = this.ticketCreator;
		if (tickets.length && !ticketCreator) throw new Error('EventService was built without a ticket creator.');
		if (ticket_groups.length && !this.groups) throw new Error('EventService was built without a group creator.');
		const publishWhenReady =
			eventInput.status === 'published' && (Boolean(draft_id) || tickets.length > 0 || ticket_groups.length > 0);
		const stored: EventStorageInput = {
			...sanitizeEventDescriptions(eventInput),
			...(draft_id || publishWhenReady ? { status: 'draft' as const } : {}),
			...(draft_id ? { source_draft_id: draft_id } : {}),
		};
		const created = await this.repository.createForUser(userId, stored);
		if (created === 'organizer_required') throw new OrganizerRequired();
		const { id, organizer_id } = created;
		const organizerId = typeof organizer_id === 'string' ? organizer_id : organizer_id.id;
		let event = created;
		let publicationAttempted = false;
		try {
			const groupIds = ticket_groups.length ? await this.groups!.create(organizerId, id, ticket_groups) : {};
			for (const ticket of tickets) {
				const groupId = ticket.group_id ? groupIds[ticket.group_id] : undefined;
				if (ticket.group_id && !groupId)
					throw new ApiError('O grupo deste ingresso não pertence ao evento.', 422, 'INVALID_TICKET_GROUP');
				await ticketCreator!.create(organizerId, {
					...ticket,
					event_id: id,
					...(groupId ? { group_id: groupId } : {}),
				});
			}
			if (draft_id && !(await this.drafts!.completeForUser(userId, draft_id, id))) throw draftNotFound();
			if (publishWhenReady) {
				await this.assertCanPublish(userId);
				publicationAttempted = true;
				const published = await this.repository.updateForUser(userId, id, { status: 'published' });
				if (!published) throw new EventNotFound();
				event = published;
			}
			return event;
		} catch (error) {
			// After a publication attempt the response may be lost after commit. Preserve
			// the linked event; replay returns its actual state without publishing again.
			// Before this point it is still a draft, and the FK preserves its snapshot.
			if (!draft_id || !publicationAttempted) await this.repository.deleteForUser(userId, id).catch(() => undefined);
			throw error;
		}
	}
	private async assertCanPublish(userId: string) {
		if (!(await this.repository.canPublishForUser(userId))) throw new OrganizerRequired();
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
		if (patch.status === 'published' && current.status !== 'published') await this.assertCanPublish(userId);
		const merged = eventInputSchema.parse({ ...flattenRelations(current), ...patch });
		if (merged.status === 'published' && merged.is_free === false && !current.tickets?.length) {
			throw new ApiError(
				'Adicione ao menos um ingresso antes de publicar um evento pago.',
				422,
				'EVENT_TICKETS_REQUIRED',
			);
		}
		const event = await this.repository.updateForUser(userId, id, sanitizeEventDescriptions(patch));
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
	// Retired database columns are not editable event inputs.
	delete flat.registration_start;
	delete flat.registration_end;
	for (const field of RELATION_FIELDS) {
		const value = flat[field];
		if (value && typeof value === 'object' && 'id' in value) flat[field] = (value as { id: string }).id;
	}

	return flat;
}
