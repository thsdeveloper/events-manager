import { z } from 'zod';
import { migrateEventSalesPeriod } from './event-sales-period.js';
import { eventMetadataSchema, eventStatusSchema, eventVisibilitySchema } from './schemas.js';
const text = (max: number) => z.string().max(max).nullable().optional();
const draftTicketSchema = z.object({
	id: z.string().max(128).optional(),
	clientId: z.string().max(128).optional(),
	title: z.string().max(255).optional(),
	description: text(1000),
	quantity: z.number().int().nonnegative().optional(),
	price: z.number().finite().nonnegative().optional(),
	service_fee_type: z.enum(['absorbed', 'passed_to_buyer']).optional(),
	visibility: z.enum(['public', 'invited_only', 'manual']).optional(),
	status: z.enum(['active', 'sold_out', 'inactive']).optional(),
	sale_start_date: text(64),
	sale_end_date: text(64),
	min_quantity_per_purchase: z.number().int().nonnegative().optional(),
	max_quantity_per_purchase: z.number().int().nonnegative().optional(),
	allow_installments: z.boolean().optional(),
	max_installments: z.number().int().min(0).max(12).nullable().optional(),
	min_amount_for_installments: z.number().finite().nonnegative().nullable().optional(),
	group_id: z.string().uuid().nullable().optional(),
	admission_type: z.enum(['standard', 'half_price']).optional(),
});
const draftGroupSchema = z.object({
	client_id: z.string().uuid(),
	title: z.string().max(120),
	parent_client_id: z.string().uuid().nullable().optional(),
	sort: z.number().int().nonnegative().optional(),
});
/** Work-in-progress accepts empty fields; final publication uses eventCreateSchema. */
export const eventDraftValuesSchema = z
	.object({
		title: z.string().max(100).optional(),
		slug: z.string().max(150).optional(),
		category_id: text(128),
		cover_image: text(128),
		description: text(100000),
		short_description: text(160),
		tags: z.array(z.string().max(24)).max(10).optional(),
		start_date: text(64),
		end_date: text(64),
		registration_start: text(64),
		registration_end: text(64),
		event_type: z.enum(['in_person', 'online', 'hybrid']).optional(),
		location_name: text(240),
		location_address: text(1000),
		latitude: z.number().min(-90).max(90).nullable().optional(),
		longitude: z.number().min(-180).max(180).nullable().optional(),
		online_url: text(2048),
		is_free: z.boolean().optional(),
		tickets: z.array(draftTicketSchema).max(1000).optional(),
		ticket_groups: z.array(draftGroupSchema).max(100).optional(),
		max_attendees: z.number().int().positive().nullable().optional(),
		status: eventStatusSchema.optional(),
		visibility: eventVisibilitySchema.optional(),
		featured: z.boolean().optional(),
		publish_after_create: z.boolean().optional(),
	})
	.merge(eventMetadataSchema)
	.transform(migrateEventSalesPeriod);
export const eventDraftInputSchema = z.object({
	values: eventDraftValuesSchema,
	current_step: z.number().int().min(0).max(6).default(0),
});
export type EventDraftInput = z.infer<typeof eventDraftInputSchema>;
export interface EventDraftSnapshot {
	id: string;
	organizer_id: string;
	values: Record<string, unknown>;
	current_step: number;
	date_created: string;
	date_updated: string;
	event_id: string | null;
}
