import type { EventTicketGroupDraft } from '@events-manager/contracts';
import {
	TicketGroupService,
	type TicketGroupRepository,
	type TicketGroupData,
} from '../../application/admin/ticket-group-service.js';
import type { SupabaseClients } from './clients.js';
export class SupabaseTicketGroupRepository implements TicketGroupRepository {
	constructor(private readonly clients: SupabaseClients) {}
	async ownsEvent(organizerId: string, eventId: string) {
		const { data, error } = await this.clients.admin
			.from('events')
			.select('id')
			.eq('id', eventId)
			.eq('organizer_id', organizerId)
			.maybeSingle();
		if (error) throw error;
		return Boolean(data);
	}
	async list(eventId: string) {
		const { data, error } = await this.clients.admin
			.from('event_ticket_groups')
			.select('*')
			.eq('event_id', eventId)
			.order('sort')
			.order('title');
		if (error) throw error;
		return (data ?? []) as TicketGroupData[];
	}
	async find(eventId: string, id: string) {
		const { data, error } = await this.clients.admin
			.from('event_ticket_groups')
			.select('*')
			.eq('event_id', eventId)
			.eq('id', id)
			.maybeSingle();
		if (error) throw error;
		return data as TicketGroupData | null;
	}
	async create(eventId: string, input: { title: string; parent_id?: string | null; sort?: number }) {
		const { data, error } = await this.clients.admin
			.from('event_ticket_groups')
			.insert({ ...input, event_id: eventId })
			.select('*')
			.single();
		if (error) throw error;
		return data as TicketGroupData;
	}
	async update(eventId: string, id: string, input: Partial<{ title: string; parent_id: string | null; sort: number }>) {
		const { data, error } = await this.clients.admin
			.from('event_ticket_groups')
			.update(input)
			.eq('event_id', eventId)
			.eq('id', id)
			.select('*')
			.maybeSingle();
		if (error) throw error;
		return data as TicketGroupData | null;
	}
	async remove(eventId: string, id: string) {
		const { data, error } = await this.clients.admin
			.from('event_ticket_groups')
			.delete()
			.eq('event_id', eventId)
			.eq('id', id)
			.select('id')
			.maybeSingle();
		if (error) throw error;
		return Boolean(data);
	}
	async assignedTickets(eventId: string, id: string) {
		const { count, error } = await this.clients.admin
			.from('event_tickets')
			.select('id', { count: 'exact', head: true })
			.eq('event_id', eventId)
			.eq('group_id', id);
		if (error) throw error;
		return count ?? 0;
	}
	async ticketIds(eventId: string) {
		const { data, error } = await this.clients.admin.from('event_tickets').select('id').eq('event_id', eventId);
		if (error) throw error;
		return (data ?? []).map((row) => row.id);
	}
	async reorder(eventId: string, ids: string[]) {
		const { error } = await this.clients.admin.rpc('reorder_event_tickets', { p_event_id: eventId, p_ticket_ids: ids });
		if (error) throw error;
	}
}
export async function createEventTicketGroups(
	clients: SupabaseClients,
	organizerId: string,
	eventId: string,
	groups: EventTicketGroupDraft[],
): Promise<Record<string, string>> {
	const service = new TicketGroupService(new SupabaseTicketGroupRepository(clients));
	const result: Record<string, string> = {};
	for (const item of [
		...groups.filter((group) => !group.parent_client_id),
		...groups.filter((group) => group.parent_client_id),
	]) {
		const created = await service.create(organizerId, eventId, {
			title: item.title,
			parent_id: item.parent_client_id ? result[item.parent_client_id] : null,
			sort: item.sort ?? 0,
		});
		result[item.client_id] = created.id;
	}
	return result;
}
