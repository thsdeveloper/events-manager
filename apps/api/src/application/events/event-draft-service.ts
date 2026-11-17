import { migrateEventSalesPeriod, type EventDraftInput, type EventDraftSnapshot } from '@events-manager/contracts';
import { ApiError } from '../../shared/errors.js';
import { sanitizeEventDescriptions } from './event-description.js';
export interface EventDraftRepository {
	listForUser(userId: string): Promise<EventDraftSnapshot[]>;
	findForUser(userId: string, id: string): Promise<EventDraftSnapshot | null>;
	createForUser(userId: string, input: EventDraftInput): Promise<EventDraftSnapshot>;
	updateForUser(userId: string, id: string, input: EventDraftInput): Promise<EventDraftSnapshot | null>;
	deleteForUser(userId: string, id: string): Promise<boolean>;
	completeForUser(userId: string, id: string, eventId: string): Promise<boolean>;
}
export function draftNotFound() {
	return new ApiError('Rascunho não encontrado.', 404, 'EVENT_DRAFT_NOT_FOUND');
}
export class EventDraftService {
	constructor(private readonly repository: EventDraftRepository) {}
	listForUser(userId: string) {
		return this.repository.listForUser(userId);
	}
	async getForUser(userId: string, id: string) {
		const draft = await this.repository.findForUser(userId, id);
		if (!draft) throw draftNotFound();
		return { ...draft, values: migrateEventSalesPeriod(draft.values) };
	}
	create(userId: string, input: EventDraftInput) {
		return this.repository.createForUser(userId, this.clean(input));
	}
	async update(userId: string, id: string, input: EventDraftInput) {
		this.assertNotConverted(await this.getForUser(userId, id));
		const draft = await this.repository.updateForUser(userId, id, this.clean(input));
		if (!draft) throw draftNotFound();
		return { ...draft, values: migrateEventSalesPeriod(draft.values) };
	}
	async delete(userId: string, id: string) {
		this.assertNotConverted(await this.getForUser(userId, id));
		if (!(await this.repository.deleteForUser(userId, id))) throw draftNotFound();
	}
	private clean(input: EventDraftInput): EventDraftInput {
		return { ...input, values: sanitizeEventDescriptions(input.values) };
	}
	private assertNotConverted(draft: EventDraftSnapshot) {
		if (draft.event_id)
			throw new ApiError(
				'Este rascunho já foi convertido em um evento. Edite o evento para continuar.',
				409,
				'EVENT_DRAFT_CONVERTED',
			);
	}
}
