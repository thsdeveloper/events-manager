import type { Event, EventCategory, Organizer, EventTicket } from '@events-manager/contracts';
import { sanitizeHtml } from '@events-manager/contracts';
import type { EventWizardFormValues } from './types';

export const contentDefaults = {
	cover_image_alt: '',
	description_en: '',
	description_es: '',
	location_tbd: false,
	show_map: true,
	location_street: '',
	location_number: '',
	location_complement: '',
	location_neighborhood: '',
	location_city: '',
	location_state: '',
	location_postal_code: '',
	online_platform: 'custom' as const,
};

export function contentFromEvent(event: Event) {
	return {
		...contentDefaults,
		cover_image_alt: event.cover_image_alt ?? '',
		description_en: event.description_en ?? '',
		description_es: event.description_es ?? '',
		location_tbd: event.location_tbd ?? false,
		show_map: event.show_map ?? true,
		location_street: event.location_street ?? '',
		location_number: event.location_number ?? '',
		location_complement: event.location_complement ?? '',
		location_neighborhood: event.location_neighborhood ?? '',
		location_city: event.location_city ?? '',
		location_state: event.location_state ?? '',
		location_postal_code: event.location_postal_code ?? '',
		online_platform: event.online_platform ?? 'custom',
	};
}

export function structuredAddress(values: Partial<EventWizardFormValues>) {
	const street = [values.location_street, values.location_number].filter(Boolean).join(', ');

	return [
		street,
		values.location_complement,
		values.location_neighborhood,
		values.location_city,
		values.location_state,
		values.location_postal_code,
	]
		.filter(Boolean)
		.join(' — ');
}

export function contentPayload(values: EventWizardFormValues) {
	const physical = values.event_type !== 'online' && !values.location_tbd;
	const nullable = (value?: string) => value?.trim() || null;

	return {
		cover_image_alt: nullable(values.cover_image_alt),
		description_en: nullable(values.description_en),
		description_es: nullable(values.description_es),
		location_tbd: values.location_tbd ?? false,
		show_map: values.show_map ?? true,
		location_name: physical ? nullable(values.location_name) : null,
		location_address: physical ? nullable(structuredAddress(values) || values.location_address) : null,
		latitude: physical ? (values.latitude ?? null) : null,
		longitude: physical ? (values.longitude ?? null) : null,
		location_street: physical ? nullable(values.location_street) : null,
		location_number: physical ? nullable(values.location_number) : null,
		location_complement: physical ? nullable(values.location_complement) : null,
		location_neighborhood: physical ? nullable(values.location_neighborhood) : null,
		location_city: physical ? nullable(values.location_city) : null,
		location_state: physical ? nullable(values.location_state) : null,
		location_postal_code: physical ? nullable(values.location_postal_code) : null,
		online_platform: values.event_type === 'in_person' ? null : (values.online_platform ?? 'custom'),
		online_url: values.event_type === 'in_person' ? null : nullable(values.online_url),
	};
}

export function eventForPreview(
	values: EventWizardFormValues,
	organizer: Organizer | null,
	categories: EventCategory[],
	existing?: Event,
): Event {
	const id = existing?.id ?? 'preview';

	return {
		...existing,
		...values,
		...contentPayload(values),
		id,
		title: values.title?.trim() || 'Seu evento',
		slug: existing?.slug ?? '',
		organizer_id: organizer ?? existing?.organizer_id ?? '',
		category_id: categories.find((category) => category.id === values.category_id) ?? null,
		cover_image:
			values.cover_image && /^[0-9a-f-]{36}$/i.test(values.cover_image)
				? typeof existing?.cover_image === 'object' && existing.cover_image?.id === values.cover_image
					? existing.cover_image
					: values.cover_image
				: null,
		description: sanitizeHtml(values.description ?? ''),
		ticket_groups: (values.ticket_groups ?? []).map((group) => ({
			id: group.client_id,
			event_id: id,
			title: group.title,
			parent_id: group.parent_client_id ?? null,
			sort: group.sort ?? 0,
		})),
		tickets: (values.tickets ?? []).map(
			(ticket, index) =>
				({
					...ticket,
					id: ticket.id ?? ticket.clientId ?? 'preview-ticket-' + index,
					event_id: id,
					quantity_sold: 0,
				}) as EventTicket,
		),
	};
}
