import { z } from 'zod';
export const credentialsSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});
export const registerSchema = credentialsSchema.extend({
    first_name: z.string().trim().min(1),
    last_name: z.string().trim().min(1),
});
export const updateProfileSchema = z.object({
    first_name: z.string().trim().min(1).nullable().optional(),
    last_name: z.string().trim().min(1).nullable().optional(),
    email: z.string().email().optional(),
    avatar: z.string().uuid().nullable().optional(),
    location: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
});
export const eventStatusSchema = z.enum(['published', 'draft', 'cancelled', 'archived']);
const isoDateTimeSchema = z
    .string()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Data e hora inválidas')
    .transform((value) => new Date(value).toISOString());
export const eventInputSchema = z.object({
    title: z.string().trim().min(3),
    slug: z.string().trim().min(3).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    description: z.string().nullable().optional(),
    short_description: z.string().nullable().optional(),
    cover_image: z.string().uuid().nullable().optional(),
    category_id: z.string().uuid().nullable().optional(),
    event_type: z.enum(['in_person', 'online', 'hybrid']).nullable().optional(),
    start_date: isoDateTimeSchema,
    end_date: isoDateTimeSchema,
    location_name: z.string().nullable().optional(),
    location_address: z.string().nullable().optional(),
    online_url: z.string().url().nullable().optional(),
    max_attendees: z.number().int().positive().nullable().optional(),
    registration_start: isoDateTimeSchema.nullable().optional(),
    registration_end: isoDateTimeSchema.nullable().optional(),
    is_free: z.boolean().optional(),
    featured: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    status: eventStatusSchema.optional(),
});
export const ticketInputSchema = z.object({
    event_id: z.string().uuid(),
    title: z.string().trim().min(1),
    description: z.string().nullable().optional(),
    quantity: z.number().int().positive(),
    price: z.number().nonnegative(),
    service_fee_type: z.enum(['absorbed', 'passed_to_buyer']),
    status: z.enum(['active', 'sold_out', 'inactive']).optional(),
    visibility: z.enum(['public', 'invited_only', 'manual']).optional(),
    sale_start_date: isoDateTimeSchema.nullable().optional(),
    sale_end_date: isoDateTimeSchema.nullable().optional(),
    min_quantity_per_purchase: z.number().int().positive().optional(),
    max_quantity_per_purchase: z.number().int().positive().optional(),
    allow_installments: z.boolean().optional(),
    max_installments: z.number().int().min(1).max(12).nullable().optional(),
    min_amount_for_installments: z.number().nonnegative().nullable().optional(),
});
//# sourceMappingURL=schemas.js.map