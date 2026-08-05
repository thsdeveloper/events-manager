import { z } from 'zod';
export declare const credentialsSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
} & {
    first_name: z.ZodString;
    last_name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
}, {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
}>;
export declare const updateProfileSchema: z.ZodObject<{
    first_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    last_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    email: z.ZodOptional<z.ZodString>;
    avatar: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    location: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    avatar?: string | null | undefined;
    email?: string | undefined;
    first_name?: string | null | undefined;
    last_name?: string | null | undefined;
    location?: string | null | undefined;
    title?: string | null | undefined;
    description?: string | null | undefined;
}, {
    avatar?: string | null | undefined;
    email?: string | undefined;
    first_name?: string | null | undefined;
    last_name?: string | null | undefined;
    location?: string | null | undefined;
    title?: string | null | undefined;
    description?: string | null | undefined;
}>;
export declare const eventStatusSchema: z.ZodEnum<["published", "draft", "cancelled", "archived"]>;
export declare const eventInputSchema: z.ZodObject<{
    title: z.ZodString;
    slug: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    short_description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    cover_image: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    category_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    event_type: z.ZodOptional<z.ZodNullable<z.ZodEnum<["in_person", "online", "hybrid"]>>>;
    start_date: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
    end_date: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
    location_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    location_address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    online_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    max_attendees: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    registration_start: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>>;
    registration_end: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>>;
    is_free: z.ZodOptional<z.ZodBoolean>;
    featured: z.ZodOptional<z.ZodBoolean>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    status: z.ZodOptional<z.ZodEnum<["published", "draft", "cancelled", "archived"]>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    slug: string;
    start_date: string;
    end_date: string;
    category_id?: string | null | undefined;
    cover_image?: string | null | undefined;
    status?: "archived" | "draft" | "published" | "cancelled" | undefined;
    description?: string | null | undefined;
    short_description?: string | null | undefined;
    event_type?: "in_person" | "online" | "hybrid" | null | undefined;
    location_name?: string | null | undefined;
    location_address?: string | null | undefined;
    online_url?: string | null | undefined;
    max_attendees?: number | null | undefined;
    registration_start?: string | null | undefined;
    registration_end?: string | null | undefined;
    is_free?: boolean | undefined;
    featured?: boolean | undefined;
    tags?: string[] | undefined;
}, {
    title: string;
    slug: string;
    start_date: string;
    end_date: string;
    category_id?: string | null | undefined;
    cover_image?: string | null | undefined;
    status?: "archived" | "draft" | "published" | "cancelled" | undefined;
    description?: string | null | undefined;
    short_description?: string | null | undefined;
    event_type?: "in_person" | "online" | "hybrid" | null | undefined;
    location_name?: string | null | undefined;
    location_address?: string | null | undefined;
    online_url?: string | null | undefined;
    max_attendees?: number | null | undefined;
    registration_start?: string | null | undefined;
    registration_end?: string | null | undefined;
    is_free?: boolean | undefined;
    featured?: boolean | undefined;
    tags?: string[] | undefined;
}>;
export declare const ticketInputSchema: z.ZodObject<{
    event_id: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    quantity: z.ZodNumber;
    price: z.ZodNumber;
    service_fee_type: z.ZodEnum<["absorbed", "passed_to_buyer"]>;
    status: z.ZodOptional<z.ZodEnum<["active", "sold_out", "inactive"]>>;
    visibility: z.ZodOptional<z.ZodEnum<["public", "invited_only", "manual"]>>;
    sale_start_date: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>>;
    sale_end_date: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>>;
    min_quantity_per_purchase: z.ZodOptional<z.ZodNumber>;
    max_quantity_per_purchase: z.ZodOptional<z.ZodNumber>;
    allow_installments: z.ZodOptional<z.ZodBoolean>;
    max_installments: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    min_amount_for_installments: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    event_id: string;
    title: string;
    quantity: number;
    price: number;
    service_fee_type: "absorbed" | "passed_to_buyer";
    status?: "active" | "sold_out" | "inactive" | undefined;
    description?: string | null | undefined;
    visibility?: "public" | "invited_only" | "manual" | undefined;
    sale_start_date?: string | null | undefined;
    sale_end_date?: string | null | undefined;
    min_quantity_per_purchase?: number | undefined;
    max_quantity_per_purchase?: number | undefined;
    allow_installments?: boolean | undefined;
    max_installments?: number | null | undefined;
    min_amount_for_installments?: number | null | undefined;
}, {
    event_id: string;
    title: string;
    quantity: number;
    price: number;
    service_fee_type: "absorbed" | "passed_to_buyer";
    status?: "active" | "sold_out" | "inactive" | undefined;
    description?: string | null | undefined;
    visibility?: "public" | "invited_only" | "manual" | undefined;
    sale_start_date?: string | null | undefined;
    sale_end_date?: string | null | undefined;
    min_quantity_per_purchase?: number | undefined;
    max_quantity_per_purchase?: number | undefined;
    allow_installments?: boolean | undefined;
    max_installments?: number | null | undefined;
    min_amount_for_installments?: number | null | undefined;
}>;
export type CredentialsInput = z.infer<typeof credentialsSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type EventInput = z.infer<typeof eventInputSchema>;
export type TicketInput = z.infer<typeof ticketInputSchema>;
//# sourceMappingURL=schemas.d.ts.map