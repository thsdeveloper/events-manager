import { z } from 'zod';
import { brPhoneSchema, httpUrlSchema } from './schemas.js';

export const organizerStatusSchema = z.enum(['active', 'pending', 'archived']);
export const organizerPayoutStatusSchema = z.enum(['not_configured', 'pending_review', 'enabled', 'blocked']);
export const organizerAdminQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
	search: z
		.string()
		.trim()
		.max(200)
		.transform((value) => (/^[\d./\s-]+$/.test(value) ? value.replace(/\D/g, '') : value))
		.default(''),
	status: organizerStatusSchema.optional(),
	sort: z.enum(['name', 'email', 'status', 'payout_status', 'date_created']).default('date_created'),
	direction: z.enum(['asc', 'desc']).default('desc'),
});
export const organizerRecordQuerySchema = z.object({
	kind: z.enum(['events', 'transactions', 'payouts', 'activity']),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
});
const pixTypes = z.enum(['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM']);
export const organizerAdminUpdateSchema = z
	.object({
		name: z.string().trim().min(2).max(120).optional(),
		email: z.string().trim().email().optional(),
		phone: brPhoneSchema.nullable().optional(),
		description: z.string().trim().max(2000).nullable().optional(),
		website: httpUrlSchema.nullable().optional(),
		status: organizerStatusSchema.optional(),
		reason: z.string().trim().min(5, 'Explique o motivo em pelo menos 5 caracteres.').max(1000),
	})
	.strict()
	.refine((input) => Object.keys(input).some((key) => key !== 'reason'), 'Informe uma alteração.');
export const organizerSupportNoteSchema = z.object({ note: z.string().trim().min(5).max(4000) }).strict();
export type OrganizerAdminQuery = z.infer<typeof organizerAdminQuerySchema>;
export type OrganizerAdminUpdate = z.infer<typeof organizerAdminUpdateSchema>;
export type OrganizerRecordQuery = z.infer<typeof organizerRecordQuerySchema>;
export interface AdminPagination {
	page: number;
	limit: number;
	total: number;
	pageCount: number;
}
export interface OrganizerAdminRecord {
	id: string;
	user_id: string | null;
	name: string;
	email: string;
	phone: string | null;
	document: string | null;
	description: string | null;
	website: string | null;
	status: z.infer<typeof organizerStatusSchema>;
	payout_status: z.infer<typeof organizerPayoutStatusSchema>;
	receiving_method?: 'pix' | 'bank_transfer' | null;
	production_approved_at?: string | null;
	payout_pix_key: string | null;
	payout_pix_key_type: z.infer<typeof pixTypes> | null;
	date_created: string;
	date_updated: string;
}
export interface OrganizerAdminMetrics {
	events: number;
	ticketsSold: number;
	grossRevenue: number;
}
export interface OrganizerAdminList {
	data: Array<OrganizerAdminRecord & { metrics: OrganizerAdminMetrics }>;
	pagination: AdminPagination;
}
export interface OrganizerSupportDetail {
	organizer: OrganizerAdminRecord;
	owner: {
		id: string;
		first_name: string | null;
		last_name: string | null;
		email: string | null;
		phone: string | null;
		document: string | null;
		status: string;
		phone_verified_at: string | null;
	} | null;
	metrics: OrganizerAdminMetrics & {
		publishedEvents: number;
		registrations: number;
		failedPayments: number;
		availableBalance: number;
		reservedPayouts: number;
		completedPayouts: number;
	};
}
export interface OrganizerSupportRecords {
	data: Array<Record<string, unknown>>;
	pagination: AdminPagination;
}
