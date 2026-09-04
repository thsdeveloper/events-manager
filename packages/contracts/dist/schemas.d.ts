import { z } from 'zod';
export declare const PASSWORD_MIN_LENGTH = 8;
export declare const PASSWORD_MAX_LENGTH = 64;
/**
 * Política de senha da plataforma, aplicada a toda senha NOVA: cadastro,
 * redefinição por e-mail e troca dentro do perfil. Pelo menos 8 caracteres, com
 * letras, números e ao menos um caractere especial — ex.: `Qsesbs2006#@!`.
 *
 * O que conta como especial é definido por exclusão (nem letra, nem número) em
 * vez de uma lista fixa de símbolos: uma lista rejeitaria caracteres válidos que
 * a pessoa escolheu só porque não foram previstos. Letras e números usam
 * categorias Unicode, então `senhÃ` conta como letra igual a `senha`.
 *
 * O teto de 64 existe porque o bcrypt — usado pelo Supabase para o hash —
 * trunca em 72 bytes: sem ele, uma frase longa daria falsa sensação de força, e
 * acentuação em UTF-8 gasta 2 bytes por caractere.
 */
export declare const newPasswordSchema: z.ZodString;
/**
 * O login valida apenas que algo foi enviado. A política acima vale para senhas
 * novas: exigi-la aqui trancaria fora quem se cadastrou antes dela — inclusive
 * impedindo a pessoa de entrar justamente para trocar a senha. Quem decide se a
 * senha confere é o provedor.
 */
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
} & {
    first_name: z.ZodString;
    last_name: z.ZodString;
    password: z.ZodString;
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
export declare const emailConfirmationSchema: z.ZodObject<{
    email: z.ZodString;
    token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    token: string;
}, {
    email: string;
    token: string;
}>;
export declare const resendEmailConfirmationSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export declare const updateProfileSchema: z.ZodObject<{
    first_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    last_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    email: z.ZodOptional<z.ZodString>;
    avatar: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    /**
     * A localização entra pelo código IBGE do município, não por texto livre: o
     * rótulo em `profiles.location` é escrito pelo servidor a partir daqui.
     */
    city_id: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    avatar?: string | null | undefined;
    email?: string | undefined;
    first_name?: string | null | undefined;
    last_name?: string | null | undefined;
    city_id?: number | null | undefined;
    title?: string | null | undefined;
    description?: string | null | undefined;
}, {
    avatar?: string | null | undefined;
    email?: string | undefined;
    first_name?: string | null | undefined;
    last_name?: string | null | undefined;
    city_id?: number | null | undefined;
    title?: string | null | undefined;
    description?: string | null | undefined;
}>;
export declare const eventStatusSchema: z.ZodEnum<["published", "draft", "cancelled", "archived"]>;
export declare const httpUrlSchema: z.ZodEffects<z.ZodString, string, string>;
export declare const eventInputSchema: z.ZodEffects<z.ZodObject<{
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
    latitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    longitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    online_url: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodString, string, string>>>;
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
    latitude?: number | null | undefined;
    longitude?: number | null | undefined;
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
    latitude?: number | null | undefined;
    longitude?: number | null | undefined;
    online_url?: string | null | undefined;
    max_attendees?: number | null | undefined;
    registration_start?: string | null | undefined;
    registration_end?: string | null | undefined;
    is_free?: boolean | undefined;
    featured?: boolean | undefined;
    tags?: string[] | undefined;
}>, {
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
    latitude?: number | null | undefined;
    longitude?: number | null | undefined;
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
    latitude?: number | null | undefined;
    longitude?: number | null | undefined;
    online_url?: string | null | undefined;
    max_attendees?: number | null | undefined;
    registration_start?: string | null | undefined;
    registration_end?: string | null | undefined;
    is_free?: boolean | undefined;
    featured?: boolean | undefined;
    tags?: string[] | undefined;
}>;
export declare const eventPatchSchema: z.ZodEffects<z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    short_description: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    cover_image: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    category_id: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    event_type: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodEnum<["in_person", "online", "hybrid"]>>>>;
    start_date: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>;
    end_date: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>;
    location_name: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    location_address: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    latitude: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    longitude: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    online_url: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodString, string, string>>>>;
    max_attendees: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    registration_start: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>>>;
    registration_end: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>>>;
    is_free: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    featured: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    tags: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    status: z.ZodOptional<z.ZodOptional<z.ZodEnum<["published", "draft", "cancelled", "archived"]>>>;
}, "strip", z.ZodTypeAny, {
    category_id?: string | null | undefined;
    cover_image?: string | null | undefined;
    status?: "archived" | "draft" | "published" | "cancelled" | undefined;
    title?: string | undefined;
    description?: string | null | undefined;
    slug?: string | undefined;
    short_description?: string | null | undefined;
    event_type?: "in_person" | "online" | "hybrid" | null | undefined;
    start_date?: string | undefined;
    end_date?: string | undefined;
    location_name?: string | null | undefined;
    location_address?: string | null | undefined;
    latitude?: number | null | undefined;
    longitude?: number | null | undefined;
    online_url?: string | null | undefined;
    max_attendees?: number | null | undefined;
    registration_start?: string | null | undefined;
    registration_end?: string | null | undefined;
    is_free?: boolean | undefined;
    featured?: boolean | undefined;
    tags?: string[] | undefined;
}, {
    category_id?: string | null | undefined;
    cover_image?: string | null | undefined;
    status?: "archived" | "draft" | "published" | "cancelled" | undefined;
    title?: string | undefined;
    description?: string | null | undefined;
    slug?: string | undefined;
    short_description?: string | null | undefined;
    event_type?: "in_person" | "online" | "hybrid" | null | undefined;
    start_date?: string | undefined;
    end_date?: string | undefined;
    location_name?: string | null | undefined;
    location_address?: string | null | undefined;
    latitude?: number | null | undefined;
    longitude?: number | null | undefined;
    online_url?: string | null | undefined;
    max_attendees?: number | null | undefined;
    registration_start?: string | null | undefined;
    registration_end?: string | null | undefined;
    is_free?: boolean | undefined;
    featured?: boolean | undefined;
    tags?: string[] | undefined;
}>, {
    category_id?: string | null | undefined;
    cover_image?: string | null | undefined;
    status?: "archived" | "draft" | "published" | "cancelled" | undefined;
    title?: string | undefined;
    description?: string | null | undefined;
    slug?: string | undefined;
    short_description?: string | null | undefined;
    event_type?: "in_person" | "online" | "hybrid" | null | undefined;
    start_date?: string | undefined;
    end_date?: string | undefined;
    location_name?: string | null | undefined;
    location_address?: string | null | undefined;
    latitude?: number | null | undefined;
    longitude?: number | null | undefined;
    online_url?: string | null | undefined;
    max_attendees?: number | null | undefined;
    registration_start?: string | null | undefined;
    registration_end?: string | null | undefined;
    is_free?: boolean | undefined;
    featured?: boolean | undefined;
    tags?: string[] | undefined;
}, {
    category_id?: string | null | undefined;
    cover_image?: string | null | undefined;
    status?: "archived" | "draft" | "published" | "cancelled" | undefined;
    title?: string | undefined;
    description?: string | null | undefined;
    slug?: string | undefined;
    short_description?: string | null | undefined;
    event_type?: "in_person" | "online" | "hybrid" | null | undefined;
    start_date?: string | undefined;
    end_date?: string | undefined;
    location_name?: string | null | undefined;
    location_address?: string | null | undefined;
    latitude?: number | null | undefined;
    longitude?: number | null | undefined;
    online_url?: string | null | undefined;
    max_attendees?: number | null | undefined;
    registration_start?: string | null | undefined;
    registration_end?: string | null | undefined;
    is_free?: boolean | undefined;
    featured?: boolean | undefined;
    tags?: string[] | undefined;
}>;
export declare const ticketInputSchema: z.ZodEffects<z.ZodObject<{
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
}>, {
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
export declare const ticketPatchSchema: z.ZodObject<{
    event_id: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    quantity: z.ZodOptional<z.ZodNumber>;
    price: z.ZodOptional<z.ZodNumber>;
    service_fee_type: z.ZodOptional<z.ZodEnum<["absorbed", "passed_to_buyer"]>>;
    status: z.ZodOptional<z.ZodOptional<z.ZodEnum<["active", "sold_out", "inactive"]>>>;
    visibility: z.ZodOptional<z.ZodOptional<z.ZodEnum<["public", "invited_only", "manual"]>>>;
    sale_start_date: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>>>;
    sale_end_date: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>>>;
    min_quantity_per_purchase: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    max_quantity_per_purchase: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    allow_installments: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    max_installments: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    min_amount_for_installments: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
}, "strip", z.ZodTypeAny, {
    event_id?: string | undefined;
    status?: "active" | "sold_out" | "inactive" | undefined;
    title?: string | undefined;
    description?: string | null | undefined;
    quantity?: number | undefined;
    price?: number | undefined;
    service_fee_type?: "absorbed" | "passed_to_buyer" | undefined;
    visibility?: "public" | "invited_only" | "manual" | undefined;
    sale_start_date?: string | null | undefined;
    sale_end_date?: string | null | undefined;
    min_quantity_per_purchase?: number | undefined;
    max_quantity_per_purchase?: number | undefined;
    allow_installments?: boolean | undefined;
    max_installments?: number | null | undefined;
    min_amount_for_installments?: number | null | undefined;
}, {
    event_id?: string | undefined;
    status?: "active" | "sold_out" | "inactive" | undefined;
    title?: string | undefined;
    description?: string | null | undefined;
    quantity?: number | undefined;
    price?: number | undefined;
    service_fee_type?: "absorbed" | "passed_to_buyer" | undefined;
    visibility?: "public" | "invited_only" | "manual" | undefined;
    sale_start_date?: string | null | undefined;
    sale_end_date?: string | null | undefined;
    min_quantity_per_purchase?: number | undefined;
    max_quantity_per_purchase?: number | undefined;
    allow_installments?: boolean | undefined;
    max_installments?: number | null | undefined;
    min_amount_for_installments?: number | null | undefined;
}>;
/** A ticket described before its event exists, so it carries no event_id yet. */
export declare const eventTicketDraftSchema: z.ZodObject<Omit<{
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
}, "event_id">, "strip", z.ZodTypeAny, {
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
/**
 * Creation payload. Tickets travel with the event because a paid event without
 * one is an invalid state — sending them together lets the API reject the pair
 * up front instead of leaving a half-built event behind.
 */
export declare const eventCreateSchema: z.ZodEffects<z.ZodObject<{
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
    latitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    longitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    online_url: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodString, string, string>>>;
    max_attendees: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    registration_start: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>>;
    registration_end: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>>;
    is_free: z.ZodOptional<z.ZodBoolean>;
    featured: z.ZodOptional<z.ZodBoolean>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    status: z.ZodOptional<z.ZodEnum<["published", "draft", "cancelled", "archived"]>>;
} & {
    tickets: z.ZodDefault<z.ZodArray<z.ZodObject<Omit<{
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
    }, "event_id">, "strip", z.ZodTypeAny, {
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
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    title: string;
    slug: string;
    start_date: string;
    end_date: string;
    tickets: {
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
    }[];
    category_id?: string | null | undefined;
    cover_image?: string | null | undefined;
    status?: "archived" | "draft" | "published" | "cancelled" | undefined;
    description?: string | null | undefined;
    short_description?: string | null | undefined;
    event_type?: "in_person" | "online" | "hybrid" | null | undefined;
    location_name?: string | null | undefined;
    location_address?: string | null | undefined;
    latitude?: number | null | undefined;
    longitude?: number | null | undefined;
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
    latitude?: number | null | undefined;
    longitude?: number | null | undefined;
    online_url?: string | null | undefined;
    max_attendees?: number | null | undefined;
    registration_start?: string | null | undefined;
    registration_end?: string | null | undefined;
    is_free?: boolean | undefined;
    featured?: boolean | undefined;
    tags?: string[] | undefined;
    tickets?: {
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
    }[] | undefined;
}>, {
    title: string;
    slug: string;
    start_date: string;
    end_date: string;
    tickets: {
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
    }[];
    category_id?: string | null | undefined;
    cover_image?: string | null | undefined;
    status?: "archived" | "draft" | "published" | "cancelled" | undefined;
    description?: string | null | undefined;
    short_description?: string | null | undefined;
    event_type?: "in_person" | "online" | "hybrid" | null | undefined;
    location_name?: string | null | undefined;
    location_address?: string | null | undefined;
    latitude?: number | null | undefined;
    longitude?: number | null | undefined;
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
    latitude?: number | null | undefined;
    longitude?: number | null | undefined;
    online_url?: string | null | undefined;
    max_attendees?: number | null | undefined;
    registration_start?: string | null | undefined;
    registration_end?: string | null | undefined;
    is_free?: boolean | undefined;
    featured?: boolean | undefined;
    tags?: string[] | undefined;
    tickets?: {
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
    }[] | undefined;
}>;
export type EventTicketDraft = z.infer<typeof eventTicketDraftSchema>;
export type EventCreateInput = z.infer<typeof eventCreateSchema>;
export declare const organizerDashboardSchema: z.ZodObject<{
    metrics: z.ZodObject<{
        totalEvents: z.ZodNumber;
        publishedEvents: z.ZodNumber;
        upcomingEvents: z.ZodNumber;
        participants: z.ZodNumber;
        ticketsSold: z.ZodNumber;
        grossRevenue: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        totalEvents: number;
        publishedEvents: number;
        upcomingEvents: number;
        participants: number;
        ticketsSold: number;
        grossRevenue: number;
    }, {
        totalEvents: number;
        publishedEvents: number;
        upcomingEvents: number;
        participants: number;
        ticketsSold: number;
        grossRevenue: number;
    }>;
    recentEvents: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        slug: z.ZodString;
        status: z.ZodEnum<["published", "draft", "cancelled", "archived"]>;
        startDate: z.ZodString;
        location: z.ZodString;
        participantCount: z.ZodNumber;
        ticketsSold: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        status: "archived" | "draft" | "published" | "cancelled";
        title: string;
        slug: string;
        ticketsSold: number;
        startDate: string;
        location: string;
        participantCount: number;
    }, {
        id: string;
        status: "archived" | "draft" | "published" | "cancelled";
        title: string;
        slug: string;
        ticketsSold: number;
        startDate: string;
        location: string;
        participantCount: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    metrics: {
        totalEvents: number;
        publishedEvents: number;
        upcomingEvents: number;
        participants: number;
        ticketsSold: number;
        grossRevenue: number;
    };
    recentEvents: {
        id: string;
        status: "archived" | "draft" | "published" | "cancelled";
        title: string;
        slug: string;
        ticketsSold: number;
        startDate: string;
        location: string;
        participantCount: number;
    }[];
}, {
    metrics: {
        totalEvents: number;
        publishedEvents: number;
        upcomingEvents: number;
        participants: number;
        ticketsSold: number;
        grossRevenue: number;
    };
    recentEvents: {
        id: string;
        status: "archived" | "draft" | "published" | "cancelled";
        title: string;
        slug: string;
        ticketsSold: number;
        startDate: string;
        location: string;
        participantCount: number;
    }[];
}>;
export type CredentialsInput = z.infer<typeof credentialsSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type EmailConfirmationInput = z.infer<typeof emailConfirmationSchema>;
export type ResendEmailConfirmationInput = z.infer<typeof resendEmailConfirmationSchema>;
export type EventInput = z.infer<typeof eventInputSchema>;
export type TicketInput = z.infer<typeof ticketInputSchema>;
export type OrganizerDashboard = z.infer<typeof organizerDashboardSchema>;
export declare const checkoutStatusSchema: z.ZodObject<{
    status: z.ZodEnum<["confirmed", "pending", "attention", "cancelled"]>;
    registrations: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        status: z.ZodString;
        paymentStatus: z.ZodNullable<z.ZodString>;
        totalAmount: z.ZodNullable<z.ZodNumber>;
        ticketCode: z.ZodNullable<z.ZodString>;
        event: z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            slug: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            title: string;
            slug: string;
        }, {
            id: string;
            title: string;
            slug: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        status: string;
        paymentStatus: string | null;
        totalAmount: number | null;
        ticketCode: string | null;
        event: {
            id: string;
            title: string;
            slug: string;
        };
    }, {
        id: string;
        status: string;
        paymentStatus: string | null;
        totalAmount: number | null;
        ticketCode: string | null;
        event: {
            id: string;
            title: string;
            slug: string;
        };
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    status: "confirmed" | "pending" | "cancelled" | "attention";
    registrations: {
        id: string;
        status: string;
        paymentStatus: string | null;
        totalAmount: number | null;
        ticketCode: string | null;
        event: {
            id: string;
            title: string;
            slug: string;
        };
    }[];
}, {
    status: "confirmed" | "pending" | "cancelled" | "attention";
    registrations: {
        id: string;
        status: string;
        paymentStatus: string | null;
        totalAmount: number | null;
        ticketCode: string | null;
        event: {
            id: string;
            title: string;
            slug: string;
        };
    }[];
}>;
export type CheckoutStatus = z.infer<typeof checkoutStatusSchema>;
/**
 * Phone and taxpayer id are stored as digits, so these normalise first and then
 * validate the number itself — the same rules the masked inputs apply.
 */
export declare const brPhoneSchema: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
export declare const brDocumentSchema: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
//# sourceMappingURL=schemas.d.ts.map