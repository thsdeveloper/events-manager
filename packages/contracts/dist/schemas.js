import { z } from 'zod';
import { isValidCNPJ, isValidCPF, isValidDocument, isValidPhone, onlyDigits } from './br-documents.js';
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;
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
export const newPasswordSchema = z
    .string()
    .min(PASSWORD_MIN_LENGTH, `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`)
    .max(PASSWORD_MAX_LENGTH, `A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`)
    .regex(/\p{L}/u, 'A senha deve conter pelo menos uma letra.')
    .regex(/\p{N}/u, 'A senha deve conter pelo menos um número.')
    .regex(/[^\p{L}\p{N}]/u, 'A senha deve conter pelo menos um caractere especial.');
/**
 * O login valida apenas que algo foi enviado. A política acima vale para senhas
 * novas: exigi-la aqui trancaria fora quem se cadastrou antes dela — inclusive
 * impedindo a pessoa de entrar justamente para trocar a senha. Quem decide se a
 * senha confere é o provedor.
 */
export const credentialsSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});
export const MIN_REGISTRATION_AGE = 13;
/**
 * Idade completa em anos-calendário: o aniversário de hoje conta, o de amanhã
 * não. Um aniversário em 29 de fevereiro completa o ano em 1º de março nos
 * anos sem esse dia. As datas são comparadas em UTC para não depender do fuso
 * do servidor.
 */
export function isAtLeastYearsOld(birthDate, years, today = new Date()) {
    const [year, month, day] = birthDate.split('-').map(Number);
    const threshold = new Date(Date.UTC(year + years, month - 1, day));
    const reference = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    return threshold.getTime() <= reference.getTime();
}
function isCalendarDate(value) {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
/**
 * Data de nascimento no formato do `<input type="date">` (AAAA-MM-DD). A idade
 * mínima é regra de cadastro: menores de 13 anos não podem criar conta.
 */
export const birthDateSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data no formato AAAA-MM-DD.')
    .refine(isCalendarDate, 'Data de nascimento inválida.')
    .refine((value) => isAtLeastYearsOld(value, 0), 'A data de nascimento não pode estar no futuro.')
    .refine((value) => isAtLeastYearsOld(value, MIN_REGISTRATION_AGE), `É preciso ter pelo menos ${MIN_REGISTRATION_AGE} anos para criar uma conta.`);
export const registerSchema = credentialsSchema.extend({
    first_name: z.string().trim().min(1),
    last_name: z.string().trim().min(1),
    password: newPasswordSchema,
    birth_date: birthDateSchema,
});
/** CPF da pessoa (não aceita CNPJ); guardado só com dígitos. */
export const cpfSchema = z.string().transform(onlyDigits).refine(isValidCPF, 'Informe um CPF válido.');
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
/**
 * Phone and taxpayer id are stored as digits, so these normalise first and then
 * validate the number itself — the same rules the masked inputs apply.
 */
export const brPhoneSchema = z
    .string()
    .transform(onlyDigits)
    .refine((value) => value.length === 0 || isValidPhone(value), 'Informe um telefone válido com DDD.');
/**
 * Confirmação de telefone pelo Supabase Auth (phone_change): pedir o código
 * exige um número válido; confirmar exige o mesmo número e o código de 6 dígitos.
 */
export const phoneVerificationRequestSchema = z.object({
    phone: brPhoneSchema.refine((value) => value.length > 0, 'Informe um telefone válido com DDD.'),
});
export const phoneVerificationConfirmSchema = phoneVerificationRequestSchema.extend({
    token: z
        .string()
        .trim()
        .regex(/^\d{6}$/, 'O código deve conter 6 dígitos.'),
});
export const updateProfileSchema = z.object({
    first_name: z.string().trim().min(1).nullable().optional(),
    last_name: z.string().trim().min(1).nullable().optional(),
    email: z.string().email().optional(),
    avatar: z.string().uuid().nullable().optional(),
    /**
     * A localização entra pelo código IBGE do município, não por texto livre: o
     * rótulo em `profiles.location` é escrito pelo servidor a partir daqui.
     */
    city_id: z.number().int().positive().nullable().optional(),
    description: z.string().nullable().optional(),
    document: cpfSchema.nullable().optional(),
    /** Telefone brasileiro com DDD, guardado só com dígitos. */
    phone: brPhoneSchema.nullable().optional(),
    /** Pode ser corrigida no perfil, mas nunca apagada nem abaixo da idade mínima. */
    birth_date: birthDateSchema.optional(),
    /** Exigida pela API quando o CPF muda: reautentica antes de alterar um dado sensível. */
    current_password: z.string().min(1).optional(),
});
export const eventStatusSchema = z.enum(['published', 'draft', 'cancelled', 'archived']);
function hasHttpProtocol(value) {
    try {
        return ['http:', 'https:'].includes(new URL(value).protocol);
    }
    catch {
        // Um valor que nem é URL já foi apontado por `.url()`; o refinamento
        // ainda roda e não pode virar uma exceção no lugar do erro de validação.
        return false;
    }
}
export const httpUrlSchema = z.string().url('Informe uma URL válida.').refine(hasHttpProtocol, 'Use uma URL HTTP ou HTTPS.');
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
    latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
    longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
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
// The database stores a venue pin as an all-or-nothing pair, so a half-filled
// pair is rejected here instead of surfacing as an opaque constraint violation.
function addCoordinatePairIssue(context, latitude, longitude) {
    const hasLatitude = latitude !== null && latitude !== undefined;
    const hasLongitude = longitude !== null && longitude !== undefined;
    if (hasLatitude !== hasLongitude) {
        context.addIssue({
            code: 'custom',
            message: 'Latitude e longitude devem ser informadas juntas.',
            path: [hasLatitude ? 'longitude' : 'latitude'],
        });
    }
}
export const eventInputSchema = eventFieldsSchema.superRefine((event, context) => {
    addDateOrderIssue(context, event.start_date, event.end_date, 'end_date');
    addDateOrderIssue(context, event.registration_start, event.registration_end, 'registration_end');
    addCoordinatePairIssue(context, event.latitude, event.longitude);
});
export const eventPatchSchema = eventFieldsSchema.partial().superRefine((event, context) => {
    if ('latitude' in event || 'longitude' in event) {
        addCoordinatePairIssue(context, event.latitude, event.longitude);
    }
});
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
/** A ticket described before its event exists, so it carries no event_id yet. */
export const eventTicketDraftSchema = ticketFieldsSchema.omit({ event_id: true });
/**
 * Creation payload. Tickets travel with the event because a paid event without
 * one is an invalid state — sending them together lets the API reject the pair
 * up front instead of leaving a half-built event behind.
 */
export const eventCreateSchema = eventFieldsSchema
    .extend({ tickets: z.array(eventTicketDraftSchema).default([]) })
    .superRefine((event, context) => {
    addDateOrderIssue(context, event.start_date, event.end_date, 'end_date');
    addDateOrderIssue(context, event.registration_start, event.registration_end, 'registration_end');
    addCoordinatePairIssue(context, event.latitude, event.longitude);
    if (event.is_free === false && event.tickets.length === 0) {
        context.addIssue({
            code: 'custom',
            message: 'Um evento pago precisa de pelo menos um tipo de ingresso.',
            path: ['tickets'],
        });
    }
});
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
export const brDocumentSchema = z
    .string()
    .transform(onlyDigits)
    .refine((value) => value.length === 0 || isValidDocument(value), 'Informe um CPF ou CNPJ válido.');
/**
 * Cadastro de organizador. Quem vende como pessoa física usa o CPF já
 * validado no próprio perfil: o cliente nem envia o documento, a API o lê do
 * cadastro, então ninguém consegue vincular o CPF de outra pessoa. Quem vende
 * como empresa informa um CNPJ válido. Nos dois casos a organização passa a
 * vender ingressos do mesmo jeito.
 */
const optionalTrimmedText = (max, message) => z
    .string()
    .trim()
    .max(max, message)
    .nullable()
    .optional()
    .transform((value) => value || null);
const organizerSignupBase = {
    name: z
        .string()
        .trim()
        .min(2, 'Informe o nome da organização ou marca (mínimo 2 caracteres).')
        .max(120, 'O nome deve ter no máximo 120 caracteres.'),
    email: z.string().trim().email('Informe um e-mail de contato válido.'),
    phone: z
        .string()
        .transform(onlyDigits)
        .refine((value) => value.length > 0, 'Informe o telefone com DDD.')
        .refine((value) => value.length === 0 || isValidPhone(value), 'Informe um telefone válido com DDD.'),
    description: optionalTrimmedText(600, 'Conte sobre seus eventos em até 600 caracteres.'),
    website: z
        .string()
        .trim()
        .nullable()
        .optional()
        .transform((value) => value || null)
        .pipe(httpUrlSchema.nullable()),
    accept_terms: z.literal(true, {
        errorMap: () => ({ message: 'Confirme que as informações são verdadeiras para continuar.' }),
    }),
};
export const cnpjSchema = z
    .string()
    .transform(onlyDigits)
    .refine((value) => value.length === 14 && isValidCNPJ(value), 'Informe um CNPJ válido.');
export const organizerSignupSchema = z.discriminatedUnion('account_type', [
    z.object({ account_type: z.literal('individual'), ...organizerSignupBase }),
    z.object({ account_type: z.literal('company'), ...organizerSignupBase, document: cnpjSchema }),
]);
//# sourceMappingURL=schemas.js.map