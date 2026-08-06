import { z } from 'zod';
export const credentialsSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});
export const registerSchema = credentialsSchema.extend({
    first_name: z.string().trim().min(1),
    last_name: z.string().trim().min(1),
});
export const emailConfirmationSchema = z.object({
    email: z.string().trim().email(),
    token: z
        .string()
        .trim()
        .regex(/^\d{6}$/, 'O código deve conter 6 dígitos.'),
});
export const resendEmailConfirmationSchema = z.object({
    email: z.string().trim().email(),
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
export const httpUrlSchema = z
    .string()
    .url()
    .refine((value) => ['http:', 'https:'].includes(new URL(value).protocol), 'Use uma URL HTTP ou HTTPS.');
const isoDateTimeSchema = z
    .string()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Data e hora inválidas')
    .transform((value) => new Date(value).toISOString());
const eventFieldsSchema = z.object({
    title: z.string().trim().min(3),
    slug: z
        .string()
        .trim()
        .min(3)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    description: z.string().nullable().optional(),
    short_description: z.string().nullable().optional(),
    cover_image: z.string().uuid().nullable().optional(),
    category_id: z.string().uuid().nullable().optional(),
    event_type: z.enum(['in_person', 'online', 'hybrid']).nullable().optional(),
    start_date: isoDateTimeSchema,
    end_date: isoDateTimeSchema,
    location_name: z.string().nullable().optional(),
    location_address: z.string().nullable().optional(),
    online_url: httpUrlSchema.nullable().optional(),
    max_attendees: z.number().int().positive().nullable().optional(),
    registration_start: isoDateTimeSchema.nullable().optional(),
    registration_end: isoDateTimeSchema.nullable().optional(),
    is_free: z.boolean().optional(),
    featured: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    status: eventStatusSchema.optional(),
});
function addDateOrderIssue(context, start, end, path) {
    if (start && end && new Date(end).getTime() <= new Date(start).getTime()) {
        context.addIssue({ code: 'custom', message: 'A data final deve ser posterior à inicial.', path: [path] });
    }
}
export const eventInputSchema = eventFieldsSchema.superRefine((event, context) => {
    addDateOrderIssue(context, event.start_date, event.end_date, 'end_date');
    addDateOrderIssue(context, event.registration_start, event.registration_end, 'registration_end');
});
export const eventPatchSchema = eventFieldsSchema.partial();
const ticketFieldsSchema = z.object({
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
    max_installments: z.number().int().min(2).max(12).nullable().optional(),
    min_amount_for_installments: z.number().nonnegative().nullable().optional(),
});
export const ticketInputSchema = ticketFieldsSchema.superRefine((ticket, context) => {
    addDateOrderIssue(context, ticket.sale_start_date, ticket.sale_end_date, 'sale_end_date');
    if (ticket.min_quantity_per_purchase !== undefined &&
        ticket.max_quantity_per_purchase !== undefined &&
        ticket.max_quantity_per_purchase < ticket.min_quantity_per_purchase) {
        context.addIssue({
            code: 'custom',
            message: 'O máximo por compra deve ser maior ou igual ao mínimo.',
            path: ['max_quantity_per_purchase'],
        });
    }
    if (ticket.allow_installments && !ticket.max_installments) {
        context.addIssue({
            code: 'custom',
            message: 'Informe entre 2 e 12 parcelas.',
            path: ['max_installments'],
        });
    }
});
export const ticketPatchSchema = ticketFieldsSchema.partial();
export const organizerDashboardSchema = z.object({
    metrics: z.object({
        totalEvents: z.number().int().nonnegative(),
        publishedEvents: z.number().int().nonnegative(),
        upcomingEvents: z.number().int().nonnegative(),
        participants: z.number().int().nonnegative(),
        ticketsSold: z.number().int().nonnegative(),
        grossRevenue: z.number().nonnegative(),
    }),
    recentEvents: z.array(z.object({
        id: z.string().uuid(),
        title: z.string(),
        slug: z.string(),
        status: eventStatusSchema,
        startDate: z.string().datetime({ offset: true }),
        location: z.string(),
        participantCount: z.number().int().nonnegative(),
        ticketsSold: z.number().int().nonnegative(),
    })),
});
export const checkoutStatusSchema = z.object({
    status: z.enum(['confirmed', 'pending', 'attention', 'cancelled']),
    registrations: z.array(z.object({
        id: z.string().uuid(),
        status: z.string(),
        paymentStatus: z.string().nullable(),
        totalAmount: z.number().nonnegative().nullable(),
        ticketCode: z.string().nullable(),
        event: z.object({
            id: z.string().uuid(),
            title: z.string(),
            slug: z.string(),
        }),
    })),
});
//# sourceMappingURL=schemas.js.map