import {
	buildDefaultEventPageLayout,
	eventPageLayoutSchema,
	sanitizeHtml,
	validateEventPageLayout,
	type Event,
	type EventPageLayout,
	type EventPageRecord,
	type EventPageSection,
} from '@events-manager/contracts';
import { ApiError } from '../../shared/errors.js';

export type EventPageRow = EventPageRecord;

export interface EventPageRepository {
	find(eventId: string): Promise<EventPageRow | null>;
	upsert(eventId: string, patch: Partial<Omit<EventPageRow, 'event_id' | 'date_updated'>>): Promise<EventPageRow>;
}

/** Quem confirma que o evento é da pessoa; ver `EventService.getForUser`. */
export interface OwnedEventReader {
	getForUser(userId: string, eventId: string): Promise<Event>;
}

/**
 * Página exclusiva do evento. O rascunho é o que o organizador edita; a cópia
 * publicada é o que o público vê enquanto `enabled` estiver ligado. Publicar
 * exige um layout coerente: seção de ingressos visível, âncoras únicas e
 * navegação apontando para seções existentes.
 */
export class EventPageService {
	constructor(
		private readonly repository: EventPageRepository,
		private readonly events: OwnedEventReader,
		private readonly now: () => Date = () => new Date(),
	) {}

	async get(userId: string, eventId: string): Promise<EventPageRow> {
		const event = await this.events.getForUser(userId, eventId);
		const row = await this.repository.find(eventId);

		return row ?? emptyRecord(eventId, buildDefaultEventPageLayout(event));
	}

	async saveDraft(userId: string, eventId: string, layout: EventPageLayout): Promise<EventPageRow> {
		await this.events.getForUser(userId, eventId);
		const draft = eventPageLayoutSchema.parse({
			...layout,
			sections: layout.sections.map(sanitizeSection),
		});

		return this.repository.upsert(eventId, { draft });
	}

	async publish(userId: string, eventId: string): Promise<EventPageRow> {
		const current = await this.get(userId, eventId);
		const issues = validateEventPageLayout(current.draft);
		if (issues.length > 0) {
			throw new ApiError(
				'A página ainda não pode ser publicada.',
				422,
				'EVENT_PAGE_INVALID',
				{ issues },
				{
					exposeDetail: true,
				},
			);
		}

		return this.repository.upsert(eventId, {
			draft: current.draft,
			published: current.draft,
			published_at: this.now().toISOString(),
			enabled: true,
		});
	}

	async unpublish(userId: string, eventId: string): Promise<EventPageRow> {
		await this.events.getForUser(userId, eventId);

		return this.repository.upsert(eventId, { enabled: false });
	}
}

function emptyRecord(eventId: string, draft: EventPageLayout): EventPageRow {
	return { event_id: eventId, enabled: false, draft, published: null, published_at: null, date_updated: '' };
}

/** As seções com HTML livre passam pelo mesmo sanitizador do CMS. */
function sanitizeSection(section: EventPageSection): EventPageSection {
	if (section.type === 'about' || section.type === 'richtext') {
		return { ...section, content: sanitizeHtml(section.content) };
	}

	return section;
}
