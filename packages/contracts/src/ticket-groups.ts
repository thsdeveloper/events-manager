import { z } from 'zod';
const title = z.string().trim().min(1, 'Informe o nome do grupo.').max(120);
const position = z.number().int().nonnegative();
export const ticketGroupInputSchema = z.object({
	event_id: z.string().uuid(),
	title,
	parent_id: z.string().uuid().nullable().optional(),
	sort: position.optional(),
});
export const ticketGroupPatchSchema = ticketGroupInputSchema.omit({ event_id: true }).partial();
export const eventTicketGroupDraftSchema = z.object({
	client_id: z.string().uuid(),
	title,
	parent_client_id: z.string().uuid().nullable().optional(),
	sort: position.optional(),
});
export const ticketOrderInputSchema = z.object({
	ticket_ids: z
		.array(z.string().uuid())
		.min(1)
		.max(1000)
		.refine((ids) => new Set(ids).size === ids.length, 'A lista não pode repetir ingressos.'),
});
export type EventTicketGroupDraft = z.infer<typeof eventTicketGroupDraftSchema>;
export type TicketGroupInput = z.infer<typeof ticketGroupInputSchema>;
export type TicketGroupPatch = z.infer<typeof ticketGroupPatchSchema>;
export interface EventTicketGroup {
	id: string;
	event_id: string;
	parent_id: string | null;
	title: string;
	sort: number;
	date_created?: string;
	date_updated?: string;
}

export function addTicketGroupIssues(
	groups: EventTicketGroupDraft[],
	tickets: Array<{ group_id?: string | null }>,
	ctx: z.RefinementCtx,
) {
	const byId = new Map(groups.map((group) => [group.client_id, group]));
	if (byId.size !== groups.length)
		ctx.addIssue({ code: 'custom', path: ['ticket_groups'], message: 'Cada grupo deve ter uma identificação única.' });
	groups.forEach((group, index) => {
		if (!group.parent_client_id) return;
		const parent = byId.get(group.parent_client_id);
		if (!parent || parent === group || parent.parent_client_id) {
			ctx.addIssue({
				code: 'custom',
				path: ['ticket_groups', index, 'parent_client_id'],
				message: 'Um subgrupo precisa pertencer a um grupo principal deste evento.',
			});
		}
	});
	tickets.forEach((ticket, index) => {
		if (ticket.group_id && !byId.has(ticket.group_id))
			ctx.addIssue({
				code: 'custom',
				path: ['tickets', index, 'group_id'],
				message: 'O grupo do ingresso deve estar incluído neste evento.',
			});
	});
}
