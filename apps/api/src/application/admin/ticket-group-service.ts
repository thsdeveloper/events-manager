import { ApiError } from '../../shared/errors.js';
export interface TicketGroupData {
	id: string;
	event_id: string;
	title: string;
	parent_id: string | null;
	sort: number;
}
export interface TicketGroupRepository {
	ownsEvent(organizerId: string, eventId: string): Promise<boolean>;
	list(eventId: string): Promise<TicketGroupData[]>;
	find(eventId: string, id: string): Promise<TicketGroupData | null>;
	create(eventId: string, input: { title: string; parent_id?: string | null; sort?: number }): Promise<TicketGroupData>;
	update(
		eventId: string,
		id: string,
		input: Partial<{ title: string; parent_id: string | null; sort: number }>,
	): Promise<TicketGroupData | null>;
	remove(eventId: string, id: string): Promise<boolean>;
	assignedTickets(eventId: string, id: string): Promise<number>;
	ticketIds(eventId: string): Promise<string[]>;
	reorder(eventId: string, ids: string[]): Promise<void>;
}
export class TicketGroupService {
	constructor(private readonly repository: TicketGroupRepository) {}
	async assertOwned(organizerId: string, eventId: string) {
		if (!(await this.repository.ownsEvent(organizerId, eventId)))
			throw new ApiError('Evento não encontrado ou sem permissão.', 403, 'FORBIDDEN');
	}
	async list(organizerId: string, eventId: string) {
		await this.assertOwned(organizerId, eventId);
		return this.repository.list(eventId);
	}
	async create(
		organizerId: string,
		eventId: string,
		input: { title: string; parent_id?: string | null; sort?: number },
	) {
		await this.assertOwned(organizerId, eventId);
		await this.assertParent(eventId, input.parent_id);
		return this.repository.create(eventId, input);
	}
	async update(
		organizerId: string,
		eventId: string,
		id: string,
		input: Partial<{ title: string; parent_id: string | null; sort: number }>,
	) {
		await this.assertOwned(organizerId, eventId);
		if (!(await this.repository.find(eventId, id)))
			throw new ApiError('Grupo não encontrado.', 404, 'TICKET_GROUP_NOT_FOUND');
		if (input.parent_id === id)
			throw new ApiError('Um grupo não pode ser seu próprio pai.', 422, 'INVALID_TICKET_GROUP');
		await this.assertParent(eventId, input.parent_id);
		if (input.parent_id && (await this.repository.list(eventId)).some((group) => group.parent_id === id))
			throw new ApiError('Mova os subgrupos antes de alterar o grupo pai.', 409, 'TICKET_GROUP_HAS_CHILDREN');
		const group = await this.repository.update(eventId, id, input);
		if (!group) throw new ApiError('Grupo não encontrado.', 404, 'TICKET_GROUP_NOT_FOUND');
		return group;
	}
	async remove(organizerId: string, eventId: string, id: string) {
		await this.assertOwned(organizerId, eventId);
		if (
			(await this.repository.assignedTickets(eventId, id)) > 0 ||
			(await this.repository.list(eventId)).some((group) => group.parent_id === id)
		)
			throw new ApiError('Mova os ingressos e subgrupos antes de remover este grupo.', 409, 'TICKET_GROUP_IN_USE');
		if (!(await this.repository.remove(eventId, id)))
			throw new ApiError('Grupo não encontrado.', 404, 'TICKET_GROUP_NOT_FOUND');
	}
	async reorder(organizerId: string, eventId: string, ids: string[]) {
		await this.assertOwned(organizerId, eventId);
		const existing = await this.repository.ticketIds(eventId);
		if (new Set(ids).size !== ids.length || ids.length !== existing.length || ids.some((id) => !existing.includes(id)))
			throw new ApiError(
				'A ordem deve conter todos os ingressos deste evento uma única vez.',
				422,
				'INVALID_TICKET_ORDER',
			);
		await this.repository.reorder(eventId, ids);
	}
	private async assertParent(eventId: string, parentId?: string | null) {
		if (!parentId) return;
		const parent = await this.repository.find(eventId, parentId);
		if (!parent || parent.parent_id)
			throw new ApiError('Selecione um grupo principal deste evento.', 422, 'INVALID_TICKET_GROUP');
	}
}
