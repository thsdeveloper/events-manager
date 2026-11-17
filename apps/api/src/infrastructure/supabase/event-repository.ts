import type { Event, EventInput } from '@events-manager/contracts';
import { type EventRepository, type EventStorageInput } from '../../application/events/event-service.js';
import type { SupabaseClients } from './clients.js';
import { ApiError } from '../../shared/errors.js';

export interface EventOrganizerScope {
	id: string;
	status: string;
}
/** A cookie is only a preference: candidate rows are always scoped by user ownership. */
export async function resolveEventOrganizer(
	clients: SupabaseClients,
	userId: string,
	preferredId?: string,
	strictPreference = false,
): Promise<EventOrganizerScope | null> {
	const { data, error } = await clients.admin
		.from('organizers')
		.select('id,status')
		.eq('user_id', userId)
		.order('date_created', { ascending: true });
	if (error) throw error;
	const organizers = (Array.isArray(data) ? data : data ? [data] : []) as EventOrganizerScope[];
	if (!organizers.length) return null;
	if (strictPreference) return organizers.find((organizer) => organizer.id === preferredId) ?? null;
	const preferred = organizers.find((organizer) => organizer.id === preferredId);
	if (preferred) return preferred;
	if (organizers.length > 1) {
		const remembered = await clients.admin
			.from('profiles')
			.select('active_organizer_id')
			.eq('id', userId)
			.maybeSingle();
		if (remembered.error) throw remembered.error;
		const match = organizers.find((organizer) => organizer.id === remembered.data?.active_organizer_id);
		if (match) return match;
	}
	return organizers.find((organizer) => organizer.status === 'active') ?? organizers[0];
}

export const publicEventSelection = `
  id,status,visibility,sort,date_created,date_updated,title,slug,description,description_en,description_es,cover_image_alt,short_description,event_type,start_date,end_date,
  location_name,location_address,location_tbd,show_map,online_platform,location_street,location_number,location_complement,location_neighborhood,location_city,location_state,location_postal_code,latitude,longitude,max_attendees,registration_start,registration_end,is_free,tags,featured,
  cover_image:media_files(id,bucket,path,filename,title,type,filesize,width,height,description,metadata,date_created),
  organizer_id:organizers(id,name,email,phone,description,logo,website),
  category_id:event_categories(id,sort,name,slug,description,icon,color),
  page:event_pages(enabled,published),
  ticket_groups:event_ticket_groups(id,event_id,title,parent_id,sort),
  tickets:event_tickets(id,event_id,group_id,admission_type,title,description,status,quantity,quantity_sold,price,service_fee_type,buyer_price,sale_start_date,sale_end_date,min_quantity_per_purchase,max_quantity_per_purchase,visibility,allow_installments,max_installments,min_amount_for_installments,sort,date_created,date_updated)
`;

const publicEventListSelection = `
  id,title,slug,short_description,event_type,start_date,end_date,location_name,is_free,featured,
  cover_image:media_files(id,bucket,path,filename,title,type,filesize,width,height,description,metadata,date_created),
  category_id:event_categories(id,name,slug,color)
`;

const organizerEventSelection = `
  *,cover_image:media_files(*),organizer_id:organizers(id,name,email,phone,description,logo,website),
  category_id:event_categories(*),tickets:event_tickets(*),registrations:event_registrations(id,ticket_type_id,status,payment_status,quantity,payment_amount,total_amount,inventory_reserved)
`;

export class SupabaseEventRepository implements EventRepository {
	constructor(
		private readonly clients: SupabaseClients,
		private readonly preferredOrganizerId?: string,
		private readonly strictPreference = false,
	) {}

	private organizerForUser(userId: string) {
		return resolveEventOrganizer(this.clients, userId, this.preferredOrganizerId, this.strictPreference);
	}
	async canPublishForUser(userId: string) {
		return (await this.organizerForUser(userId))?.status === 'active';
	}
	async getFeeConfiguration() {
		const { data, error } = await this.clients.admin
			.from('event_configurations')
			.select('platform_fee_percentage,platform_fee_minimum')
			.eq('id', 1)
			.single();
		if (error) throw error;
		return {
			platform_fee_percentage: Number(data?.platform_fee_percentage ?? 0),
			platform_fee_minimum: Number(data?.platform_fee_minimum ?? 0),
		};
	}

	async findPublicBySlug(slug: string) {
		const { data, error } = await this.clients.admin
			.from('events')
			.select(publicEventSelection)
			.eq('slug', slug)
			.eq('status', 'published')
			.eq('event_tickets.status', 'active')
			.eq('event_tickets.visibility', 'public')
			.maybeSingle();
		if (error) throw error;
		return data as unknown as Event | null;
	}

	async listPublic(query: { limit: number; page: number; search: string }) {
		const from = (query.page - 1) * query.limit;
		let builder = this.clients.admin
			.from('events')
			.select(publicEventListSelection, { count: 'exact' })
			.eq('status', 'published')
			.eq('visibility', 'public')
			.gte('end_date', new Date().toISOString());
		if (query.search) builder = builder.ilike('title', `%${query.search}%`);
		const { data, count, error } = await builder
			.order('start_date', { ascending: true })
			.range(from, from + query.limit - 1);
		if (error) throw error;
		return { data: data ?? [], total: count ?? 0 };
	}

	async listForUser(userId: string) {
		const organizer = await this.organizerForUser(userId);
		if (!organizer) return [];
		const { data, error } = await this.clients.admin
			.from('events')
			.select(
				'*,cover_image:media_files(*),category_id:event_categories(*),tickets:event_tickets(*),registrations:event_registrations(id,ticket_type_id,status,payment_status,quantity,payment_amount,total_amount,inventory_reserved)',
			)
			.eq('organizer_id', organizer.id)
			.order('date_created', { ascending: false });
		if (error) throw error;
		return (data ?? []) as unknown as Event[];
	}

	async listCategories() {
		const { data, error } = await this.clients.admin
			.from('event_categories')
			.select('id,sort,name,slug,description,icon,color')
			.order('sort', { ascending: true, nullsFirst: false })
			.order('name');
		if (error) throw error;
		return data ?? [];
	}

	async createForUser(userId: string, input: EventStorageInput) {
		const organizer = await this.organizerForUser(userId);
		if (
			!organizer ||
			!['active', 'pending'].includes(organizer.status) ||
			(input.status === 'published' && organizer.status !== 'active')
		)
			return 'organizer_required' as const;
		const { data, error } = await this.clients.admin
			.from('events')
			.insert({ ...input, organizer_id: organizer.id, user_created: userId })
			.select('*')
			.single();
		if (error) {
			if (error.code === '23505' && /source_draft_id/i.test(error.message + ' ' + error.details)) {
				throw new ApiError(
					'Este rascunho já está sendo convertido em evento. Aguarde e tente novamente.',
					409,
					'EVENT_DRAFT_IN_USE',
				);
			}
			throw error;
		}
		return data as unknown as Event;
	}

	async findForUser(userId: string, id: string) {
		const organizer = await this.organizerForUser(userId);
		if (!organizer) return null;
		const { data, error } = await this.clients.admin
			.from('events')
			.select(organizerEventSelection)
			.eq('id', id)
			.eq('organizer_id', organizer.id)
			.maybeSingle();
		if (error) throw error;
		return data as unknown as Event | null;
	}

	async updateForUser(userId: string, id: string, input: Partial<EventInput>) {
		const organizer = await this.organizerForUser(userId);
		if (!organizer) return null;
		const { data, error } = await this.clients.admin
			.from('events')
			.update({ ...input, user_updated: userId })
			.eq('id', id)
			.eq('organizer_id', organizer.id)
			.select('*')
			.maybeSingle();
		if (error) throw error;
		return data as unknown as Event | null;
	}

	async deleteForUser(userId: string, id: string) {
		const organizer = await this.organizerForUser(userId);
		if (!organizer) return false;
		const { error, count } = await this.clients.admin
			.from('events')
			.delete({ count: 'exact' })
			.eq('id', id)
			.eq('organizer_id', organizer.id);
		if (error) throw error;
		return Boolean(count);
	}
}
