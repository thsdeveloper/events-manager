import { z } from 'zod';
/**
 * Contratos do CMS: o que o painel do superadmin envia para a API ao gerenciar
 * páginas, blocos, menus, posts, formulários, redirecionamentos e a identidade
 * do site. As mesmas regras valem no formulário (feedback imediato) e na rota
 * (fronteira de segurança); por isso vivem aqui e não em cada aplicação.
 */
// ---------------------------------------------------------------------------
// Identificadores de URL
// ---------------------------------------------------------------------------
/**
 * Prefixos que o App Router já resolve com rotas próprias. Uma página do CMS
 * com um destes caminhos nunca seria exibida (a rota estática vence a
 * catch-all), então o painel recusa em vez de deixar a pessoa publicar algo
 * invisível.
 */
export const RESERVED_PERMALINK_PREFIXES = [
    '/admin',
    '/super-admin',
    '/perfil',
    '/login',
    '/cadastro',
    '/recuperar-senha',
    '/redefinir-senha',
    '/api',
    '/eventos',
    '/blog',
    '/taxas',
    '/my-registrations',
    '/examples',
    '/_next',
    '/sitemap.xml',
    '/robots.txt',
];
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PERMALINK_PATTERN = /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*)(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;
export function slugify(value) {
    return value
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
/** Converte um título ou caminho digitado em um permalink canônico. */
export function normalizePermalink(value) {
    const segments = value
        .split('/')
        .map((segment) => slugify(segment))
        .filter(Boolean);
    return segments.length ? `/${segments.join('/')}` : '/';
}
export function isReservedPermalink(permalink) {
    return RESERVED_PERMALINK_PREFIXES.some((prefix) => permalink === prefix || permalink.startsWith(`${prefix}/`));
}
export const permalinkSchema = z
    .string()
    .trim()
    .max(200, 'O permalink deve ter no máximo 200 caracteres.')
    .refine((value) => value === '/' || PERMALINK_PATTERN.test(value), {
    message: 'Use letras minúsculas, números e hífens, começando com "/" (ex.: /sobre-nos).',
})
    .refine((value) => !isReservedPermalink(value), {
    message: 'Este caminho é reservado pela aplicação e não pode ser usado por uma página.',
});
export const slugSchema = z
    .string()
    .trim()
    .min(1, 'Informe o slug.')
    .max(120, 'O slug deve ter no máximo 120 caracteres.')
    .regex(SLUG_PATTERN, 'Use letras minúsculas, números e hífens (ex.: meu-primeiro-post).');
// ---------------------------------------------------------------------------
// Blocos comuns
// ---------------------------------------------------------------------------
export const cmsContentStatusSchema = z.enum(['draft', 'in_review', 'published']);
const optionalText = (max) => z.string().trim().max(max).nullable().optional();
const optionalUuid = z.string().uuid().nullable().optional();
const isoDate = z.string().datetime({ offset: true });
const absoluteUrl = z.string().trim().url().refine((value) => /^https?:\/\//i.test(value), {
    message: 'Informe uma URL completa começando com http:// ou https://.',
});
/** Caminho interno (`/x`) ou URL absoluta http(s). Nunca `//` nem outros esquemas. */
const linkUrlSchema = z
    .string()
    .trim()
    .min(1, 'Informe o endereço.')
    .max(2000)
    .refine((value) => (value.startsWith('/') && !value.startsWith('//')) || /^https?:\/\/\S+$/i.test(value), {
    message: 'Use um caminho interno (/pagina) ou uma URL completa (https://...).',
});
const relativePathSchema = z
    .string()
    .trim()
    .min(1, 'Informe o caminho.')
    .max(500)
    .refine((value) => value.startsWith('/') && !value.startsWith('//'), {
    message: 'O caminho de origem deve ser relativo ao site (ex.: /antiga-pagina).',
});
export const cmsSeoSchema = z.object({
    title: z.string().trim().max(70, 'O título de SEO deve ter no máximo 70 caracteres.').nullable().optional(),
    meta_description: z
        .string()
        .trim()
        .max(160, 'A descrição deve ter no máximo 160 caracteres.')
        .nullable()
        .optional(),
    og_image: optionalUuid,
    canonical_url: absoluteUrl.nullable().optional(),
    no_index: z.boolean().default(false),
    no_follow: z.boolean().default(false),
    sitemap: z
        .object({
        change_frequency: z.enum(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']),
        priority: z.coerce.number().min(0).max(1),
    })
        .nullable()
        .optional(),
});
// ---------------------------------------------------------------------------
// Páginas e blocos
// ---------------------------------------------------------------------------
export const cmsPageInputSchema = z.object({
    title: z.string().trim().min(1, 'Informe o título da página.').max(150),
    permalink: permalinkSchema,
    status: cmsContentStatusSchema.default('draft'),
    published_at: isoDate.nullable().default(null),
    seo: cmsSeoSchema.nullable().optional(),
});
export const CMS_BLOCK_COLLECTIONS = [
    'block_hero',
    'block_richtext',
    'block_gallery',
    'block_pricing',
    'block_posts',
    'block_events',
    'block_form',
];
export const cmsButtonInputSchema = z
    .object({
    id: z.string().uuid().optional(),
    label: z.string().trim().min(1, 'Informe o texto do botão.').max(60),
    type: z.enum(['url', 'page', 'post']).default('url'),
    url: linkUrlSchema.nullable().optional(),
    page: optionalUuid,
    post: optionalUuid,
    variant: z.enum(['default', 'outline', 'soft', 'ghost', 'link']).default('default'),
})
    .superRefine((button, context) => {
    if (button.type === 'url' && !button.url) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['url'], message: 'Informe o endereço do botão.' });
    }
    if (button.type === 'page' && !button.page) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['page'], message: 'Escolha a página de destino.' });
    }
    if (button.type === 'post' && !button.post) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['post'], message: 'Escolha o post de destino.' });
    }
});
export const cmsHeroItemSchema = z.object({
    tagline: optionalText(80),
    headline: z.string().trim().min(1, 'Informe o título principal.').max(150),
    description: optionalText(500),
    image: optionalUuid,
    layout: z.enum(['image_left', 'image_center', 'image_right']).default('image_right'),
    buttons: z.array(cmsButtonInputSchema).max(4).default([]),
});
export const cmsRichtextItemSchema = z.object({
    tagline: optionalText(80),
    headline: optionalText(150),
    content: z.string().trim().min(1, 'Informe o conteúdo.').max(50_000),
    alignment: z.enum(['left', 'center']).default('left'),
});
export const cmsGalleryItemSchema = z.object({
    tagline: optionalText(80),
    headline: optionalText(150),
    items: z.array(z.object({ id: z.string().uuid().optional(), file: z.string().uuid() })).max(60).default([]),
});
export const cmsPricingItemSchema = z.object({
    tagline: optionalText(80),
    headline: optionalText(150),
    cards: z
        .array(z.object({
        id: z.string().uuid().optional(),
        title: z.string().trim().min(1, 'Informe o nome do plano.').max(60),
        description: optionalText(200),
        price: optionalText(40),
        badge: optionalText(30),
        features: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
        is_highlighted: z.boolean().default(false),
        button: cmsButtonInputSchema.nullable().optional(),
    }))
        .max(6)
        .default([]),
});
export const cmsPostsItemSchema = z.object({
    tagline: optionalText(80),
    headline: optionalText(150),
    limit: z.coerce.number().int().min(1).max(24).default(6),
});
export const cmsEventsItemSchema = z.object({
    headline: optionalText(150),
    description: optionalText(500),
    filter_by_category: optionalUuid,
    filter_featured: z.boolean().default(false),
    max_items: z.coerce.number().int().min(1).max(24).default(10),
    show_past_events: z.boolean().default(false),
});
export const cmsFormBlockItemSchema = z.object({
    tagline: optionalText(80),
    headline: optionalText(150),
    form: z.string().uuid({ message: 'Escolha o formulário.' }),
});
export const cmsBlockItemSchemas = {
    block_hero: cmsHeroItemSchema,
    block_richtext: cmsRichtextItemSchema,
    block_gallery: cmsGalleryItemSchema,
    block_pricing: cmsPricingItemSchema,
    block_posts: cmsPostsItemSchema,
    block_events: cmsEventsItemSchema,
    block_form: cmsFormBlockItemSchema,
};
const blockOptions = {
    background: z.enum(['light', 'dark']).default('light'),
    hide_block: z.boolean().default(false),
};
export const cmsPageBlockInputSchema = z.discriminatedUnion('collection', [
    z.object({ collection: z.literal('block_hero'), item: cmsHeroItemSchema, ...blockOptions }),
    z.object({ collection: z.literal('block_richtext'), item: cmsRichtextItemSchema, ...blockOptions }),
    z.object({ collection: z.literal('block_gallery'), item: cmsGalleryItemSchema, ...blockOptions }),
    z.object({ collection: z.literal('block_pricing'), item: cmsPricingItemSchema, ...blockOptions }),
    z.object({ collection: z.literal('block_posts'), item: cmsPostsItemSchema, ...blockOptions }),
    z.object({ collection: z.literal('block_events'), item: cmsEventsItemSchema, ...blockOptions }),
    z.object({ collection: z.literal('block_form'), item: cmsFormBlockItemSchema, ...blockOptions }),
]);
/** Atualização parcial de um bloco existente: opções e/ou o item por inteiro. */
export const cmsPageBlockUpdateSchema = z.object({
    background: z.enum(['light', 'dark']).optional(),
    hide_block: z.boolean().optional(),
    item: z.record(z.unknown()).optional(),
});
export const cmsReorderSchema = z.object({ order: z.array(z.string().uuid()).min(1).max(200) });
// ---------------------------------------------------------------------------
// Navegação
// ---------------------------------------------------------------------------
export const cmsNavigationInputSchema = z.object({
    id: z
        .string()
        .trim()
        .regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/, 'Use letras minúsculas, números, hífen ou sublinhado (ex.: rodape).')
        .max(40),
    title: z.string().trim().min(1, 'Informe o nome do menu.').max(80),
    is_active: z.boolean().default(true),
});
export const cmsNavigationItemInputSchema = z
    .object({
    title: z.string().trim().min(1, 'Informe o rótulo do item.').max(80),
    type: z.enum(['page', 'post', 'url', 'group']).default('url'),
    page: optionalUuid,
    post: optionalUuid,
    url: linkUrlSchema.nullable().optional(),
    parent: optionalUuid,
})
    .superRefine((item, context) => {
    if (item.type === 'page' && !item.page) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['page'], message: 'Escolha a página.' });
    }
    if (item.type === 'post' && !item.post) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['post'], message: 'Escolha o post.' });
    }
    if (item.type === 'url' && !item.url) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['url'], message: 'Informe o endereço.' });
    }
});
// ---------------------------------------------------------------------------
// Redirecionamentos
// ---------------------------------------------------------------------------
export const cmsRedirectInputSchema = z
    .object({
    url_from: relativePathSchema,
    url_to: linkUrlSchema,
    response_code: z.enum(['301', '302']).default('301'),
    note: optionalText(200),
})
    .refine((redirect) => redirect.url_from !== redirect.url_to, {
    message: 'Origem e destino não podem ser iguais.',
    path: ['url_to'],
});
// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------
export const cmsPostInputSchema = z.object({
    title: z.string().trim().min(1, 'Informe o título.').max(150),
    slug: slugSchema,
    description: z.string().trim().max(300, 'O resumo deve ter no máximo 300 caracteres.').nullable().optional(),
    content: z.string().max(200_000).nullable().optional(),
    image: optionalUuid,
    author: optionalUuid,
    status: cmsContentStatusSchema.default('draft'),
    published_at: isoDate.nullable().default(null),
    seo: cmsSeoSchema.nullable().optional(),
});
// ---------------------------------------------------------------------------
// Formulários
// ---------------------------------------------------------------------------
export const CMS_FORM_FIELD_TYPES = [
    'text',
    'textarea',
    'checkbox',
    'checkbox_group',
    'radio',
    'file',
    'select',
    'hidden',
];
const choiceTypes = new Set(['checkbox_group', 'radio', 'select']);
export const cmsFormFieldInputSchema = z
    .object({
    id: z.string().uuid().optional(),
    name: z
        .string()
        .trim()
        .regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/, 'Use letras minúsculas, números e hífens (ex.: nome-completo).')
        .max(60),
    type: z.enum(CMS_FORM_FIELD_TYPES),
    label: z.string().trim().min(1, 'Informe o rótulo.').max(120),
    placeholder: optionalText(120),
    help: optionalText(200),
    validation: optionalText(120),
    width: z.enum(['100', '67', '50', '33']).default('100'),
    choices: z.array(z.object({ text: z.string().trim().min(1).max(80), value: z.string().trim().min(1).max(80) })).max(50).nullable().optional(),
    required: z.boolean().default(false),
})
    .superRefine((field, context) => {
    if (choiceTypes.has(field.type) && !(field.choices && field.choices.length)) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['choices'],
            message: 'Informe ao menos uma opção para este tipo de campo.',
        });
    }
});
export const cmsFormInputSchema = z
    .object({
    title: z.string().trim().min(1, 'Informe o nome do formulário.').max(120),
    submit_label: optionalText(40),
    success_message: optionalText(500),
    on_success: z.enum(['redirect', 'message']).default('message'),
    success_redirect_url: linkUrlSchema.nullable().optional(),
    is_active: z.boolean().default(true),
    emails: z
        .array(z.object({ to: z.array(z.string().email()).min(1), subject: z.string().trim().min(1).max(150), message: z.string().trim().max(2000).default('') }))
        .max(5)
        .nullable()
        .optional(),
    fields: z.array(cmsFormFieldInputSchema).max(40).default([]),
})
    .superRefine((form, context) => {
    if (form.on_success === 'redirect' && !form.success_redirect_url) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['success_redirect_url'],
            message: 'Informe para onde a pessoa vai após enviar.',
        });
    }
    const names = form.fields.map((field) => field.name);
    const duplicated = names.find((name, index) => names.indexOf(name) !== index);
    if (duplicated) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['fields'],
            message: `O nome de campo "${duplicated}" está repetido.`,
        });
    }
});
// ---------------------------------------------------------------------------
// Configurações do site
// ---------------------------------------------------------------------------
export const CMS_SOCIAL_SERVICES = [
    'facebook',
    'instagram',
    'linkedin',
    'x',
    'vimeo',
    'youtube',
    'github',
    'discord',
    'docker',
];
export const cmsSiteSettingsInputSchema = z.object({
    title: z.string().trim().min(1, 'Informe o nome do site.').max(80),
    description: optionalText(300),
    tagline: optionalText(120),
    url: absoluteUrl.nullable().optional(),
    accent_color: z
        .string()
        .trim()
        .regex(/^#[0-9a-fA-F]{6}$/, 'Use uma cor no formato #rrggbb')
        .optional(),
    social_links: z.array(z.object({ service: z.enum(CMS_SOCIAL_SERVICES), url: absoluteUrl })).max(12).optional(),
    favicon: optionalUuid,
    logo: optionalUuid,
    logo_dark_mode: optionalUuid,
    default_og_image: optionalUuid,
});
// ---------------------------------------------------------------------------
// Consultas de listagem
// ---------------------------------------------------------------------------
export const cmsListQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(100).default(''),
    status: cmsContentStatusSchema.optional(),
});
//# sourceMappingURL=cms.js.map