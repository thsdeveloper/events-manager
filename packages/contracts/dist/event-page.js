import { z } from 'zod';
import { httpUrlSchema } from './schemas.js';
/**
 * Página exclusiva do evento.
 *
 * O organizador monta uma landing page com seções e um cabeçalho próprio, com
 * logo e navegação por âncoras. Não existem páginas internas: toda navegação
 * é `#âncora` dentro da própria página, e a seção de ingressos é obrigatória
 * porque é por ela que a pessoa chega ao checkout. O layout é um documento
 * JSON validado por este schema tanto no painel quanto na API.
 */
export const EVENT_PAGE_SECTION_TYPES = [
    'hero',
    'about',
    'tickets',
    'schedule',
    'speakers',
    'location',
    'faq',
    'gallery',
    'sponsors',
    'cta',
    'countdown',
    'richtext',
];
/** Âncora de seção: minúsculas, números e hífens; vira `#âncora` na URL. */
export const eventPageAnchorSchema = z
    .string()
    .trim()
    .min(1, 'Informe a âncora.')
    .max(40, 'A âncora pode ter até 40 caracteres.')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use só letras minúsculas, números e hífens.');
const mediaIdSchema = z.string().uuid();
const optionalMedia = mediaIdSchema.nullable().optional();
const text = (max) => z.string().trim().max(max);
const richHtml = z.string().max(20_000);
const itemId = z.string().min(1).max(64);
const sectionBase = {
    id: itemId,
    anchor: eventPageAnchorSchema,
    hidden: z.boolean().default(false),
    title: text(120).optional(),
};
export const eventPageHeroSchema = z.object({
    ...sectionBase,
    type: z.literal('hero'),
    subtitle: text(300).optional(),
    image: optionalMedia,
    align: z.enum(['left', 'center']).default('left'),
    showDate: z.boolean().default(true),
    showLocation: z.boolean().default(true),
    ctaLabel: text(40).default('Comprar ingressos'),
});
export const eventPageAboutSchema = z.object({ ...sectionBase, type: z.literal('about'), content: richHtml });
export const eventPageTicketsSchema = z.object({
    ...sectionBase,
    type: z.literal('tickets'),
    note: text(300).optional(),
    ctaLabel: text(40).default('Comprar ingressos'),
});
export const eventPageScheduleSchema = z.object({
    ...sectionBase,
    type: z.literal('schedule'),
    items: z
        .array(z.object({
        id: itemId,
        time: text(40),
        title: text(120).min(1, 'Informe o título.'),
        description: text(500).optional(),
        speaker: text(80).optional(),
    }))
        .max(60),
});
export const eventPageSpeakersSchema = z.object({
    ...sectionBase,
    type: z.literal('speakers'),
    items: z
        .array(z.object({
        id: itemId,
        name: text(80).min(1, 'Informe o nome.'),
        role: text(120).optional(),
        photo: optionalMedia,
        bio: text(600).optional(),
    }))
        .max(40),
});
export const eventPageLocationSchema = z.object({
    ...sectionBase,
    type: z.literal('location'),
    note: text(500).optional(),
    showMap: z.boolean().default(true),
});
export const eventPageFaqSchema = z.object({
    ...sectionBase,
    type: z.literal('faq'),
    items: z
        .array(z.object({ id: itemId, question: text(200).min(1, 'Informe a pergunta.'), answer: text(2_000) }))
        .max(40),
});
export const eventPageGallerySchema = z.object({
    ...sectionBase,
    type: z.literal('gallery'),
    items: z.array(z.object({ id: itemId, image: mediaIdSchema, caption: text(200).optional() })).max(40),
});
export const eventPageSponsorsSchema = z.object({
    ...sectionBase,
    type: z.literal('sponsors'),
    items: z
        .array(z.object({
        id: itemId,
        name: text(80).min(1, 'Informe o nome.'),
        logo: mediaIdSchema,
        url: httpUrlSchema.nullable().optional(),
    }))
        .max(60),
});
export const eventPageCtaSchema = z.object({
    ...sectionBase,
    type: z.literal('cta'),
    headline: text(120).min(1, 'Informe a chamada.'),
    text: text(300).optional(),
    buttonLabel: text(40).default('Comprar ingressos'),
    /** `tickets` rola até a seção de ingressos; uma URL abre em nova aba. */
    target: z.union([z.literal('tickets'), httpUrlSchema]).default('tickets'),
});
export const eventPageCountdownSchema = z.object({
    ...sectionBase,
    type: z.literal('countdown'),
    label: text(120).optional(),
});
export const eventPageRichtextSchema = z.object({ ...sectionBase, type: z.literal('richtext'), content: richHtml });
export const eventPageSectionSchema = z.discriminatedUnion('type', [
    eventPageHeroSchema,
    eventPageAboutSchema,
    eventPageTicketsSchema,
    eventPageScheduleSchema,
    eventPageSpeakersSchema,
    eventPageLocationSchema,
    eventPageFaqSchema,
    eventPageGallerySchema,
    eventPageSponsorsSchema,
    eventPageCtaSchema,
    eventPageCountdownSchema,
    eventPageRichtextSchema,
]);
export const eventPageNavItemSchema = z.object({
    label: text(30).min(1, 'Informe o texto do link.'),
    /** Só âncoras da própria página: a landing não tem páginas internas. */
    anchor: eventPageAnchorSchema,
});
export const eventPageHeaderSchema = z.object({
    show: z.boolean().default(true),
    sticky: z.boolean().default(true),
    /** Logo própria; sem ela, usa a do organizador quando `useOrganizerLogo`. */
    logo: optionalMedia,
    useOrganizerLogo: z.boolean().default(true),
    title: text(80).optional(),
    nav: z.array(eventPageNavItemSchema).max(8).default([]),
    ctaLabel: text(40).default('Comprar ingressos'),
});
export const eventPageThemeSchema = z.object({
    mode: z.enum(['light', 'dark']).default('light'),
    accent: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/, 'Informe uma cor em hexadecimal.')
        .nullable()
        .optional(),
});
export const eventPageFooterSchema = z.object({
    showOrganizer: z.boolean().default(true),
    note: text(300).optional(),
});
export const eventPageLayoutSchema = z.object({
    version: z.literal(1),
    theme: eventPageThemeSchema.default({ mode: 'light' }),
    header: eventPageHeaderSchema,
    footer: eventPageFooterSchema.default({ showOrganizer: true }),
    sections: z.array(eventPageSectionSchema).min(1, 'A página precisa de ao menos uma seção.').max(30),
});
/**
 * Regras que atravessam seções, além do schema: uma seção de ingressos
 * visível, âncoras únicas e navegação apontando para âncoras existentes.
 * Devolve a lista de problemas; vazia significa publicável.
 */
export function validateEventPageLayout(layout) {
    const issues = [];
    const tickets = layout.sections.filter((section) => section.type === 'tickets');
    if (tickets.length === 0) {
        issues.push({
            code: 'tickets_required',
            message: 'A página precisa da seção de ingressos: é por ela que as pessoas chegam ao checkout.',
            path: ['sections'],
        });
    }
    else if (tickets.every((section) => section.hidden)) {
        issues.push({
            code: 'tickets_hidden',
            message: 'A seção de ingressos não pode ficar oculta.',
            path: ['sections'],
        });
    }
    const seen = new Map();
    layout.sections.forEach((section, index) => {
        const first = seen.get(section.anchor);
        if (first !== undefined) {
            issues.push({
                code: 'duplicate_anchor',
                message: `A âncora "${section.anchor}" já é usada por outra seção.`,
                path: ['sections', index, 'anchor'],
            });
        }
        else {
            seen.set(section.anchor, index);
        }
    });
    layout.header.nav.forEach((item, index) => {
        if (!seen.has(item.anchor)) {
            issues.push({
                code: 'nav_anchor_missing',
                message: `O link "${item.label}" aponta para uma seção que não existe.`,
                path: ['header', 'nav', index, 'anchor'],
            });
        }
    });
    return issues;
}
export function newEventPageItemId() {
    const random = globalThis.crypto?.randomUUID?.();
    return random ? random.slice(0, 8) : Math.random().toString(36).slice(2, 10);
}
/** Rótulos e âncoras padrão de cada tipo de seção, para o painel e o layout inicial. */
export const EVENT_PAGE_SECTION_META = {
    hero: { label: 'Destaque', anchor: 'inicio', description: 'Capa com nome, data e chamada para os ingressos.' },
    about: { label: 'Sobre', anchor: 'sobre', description: 'Texto livre sobre o evento.' },
    tickets: {
        label: 'Ingressos',
        anchor: 'ingressos',
        description: 'Tipos de ingresso e o botão de compra. Obrigatória.',
    },
    schedule: { label: 'Programação', anchor: 'programacao', description: 'Horários, atividades e quem conduz.' },
    speakers: { label: 'Palestrantes', anchor: 'palestrantes', description: 'Quem participa, com foto e minibio.' },
    location: { label: 'Local', anchor: 'local', description: 'Endereço, mapa e como chegar.' },
    faq: { label: 'Perguntas frequentes', anchor: 'faq', description: 'Dúvidas comuns e respostas.' },
    gallery: { label: 'Galeria', anchor: 'galeria', description: 'Fotos de edições anteriores ou do espaço.' },
    sponsors: { label: 'Apoiadores', anchor: 'apoiadores', description: 'Logos de patrocinadores e parceiros.' },
    cta: { label: 'Chamada', anchor: 'chamada', description: 'Faixa de destaque com um botão.' },
    countdown: { label: 'Contagem regressiva', anchor: 'contagem', description: 'Quanto falta para o evento.' },
    richtext: { label: 'Texto', anchor: 'texto', description: 'Um bloco de texto formatado.' },
};
/** Âncora livre para uma nova seção do tipo dado, evitando as já usadas. */
export function nextEventPageAnchor(type, taken) {
    const used = new Set(taken);
    const base = EVENT_PAGE_SECTION_META[type].anchor;
    if (!used.has(base))
        return base;
    let index = 2;
    while (used.has(`${base}-${index}`))
        index += 1;
    return `${base}-${index}`;
}
/** Uma seção nova do tipo dado, com os valores padrão do schema. */
export function buildEventPageSection(type, taken = []) {
    const common = { id: newEventPageItemId(), anchor: nextEventPageAnchor(type, taken), hidden: false };
    const meta = EVENT_PAGE_SECTION_META[type];
    switch (type) {
        case 'hero':
            return eventPageHeroSchema.parse({ ...common, type, title: '' });
        case 'about':
            return { ...common, type, title: 'Sobre o evento', content: '' };
        case 'tickets':
            return eventPageTicketsSchema.parse({ ...common, type, title: 'Ingressos' });
        case 'schedule':
            return { ...common, type, title: meta.label, items: [] };
        case 'speakers':
            return { ...common, type, title: meta.label, items: [] };
        case 'location':
            return eventPageLocationSchema.parse({ ...common, type, title: meta.label });
        case 'faq':
            return { ...common, type, title: meta.label, items: [] };
        case 'gallery':
            return { ...common, type, title: meta.label, items: [] };
        case 'sponsors':
            return { ...common, type, title: meta.label, items: [] };
        case 'cta':
            return eventPageCtaSchema.parse({ ...common, type, headline: 'Garanta seu lugar' });
        case 'countdown':
            return { ...common, type, title: meta.label };
        case 'richtext':
            return { ...common, type, content: '' };
    }
}
/**
 * Layout inicial a partir do próprio evento: destaque com a capa, "Sobre" com a
 * descrição e a seção de ingressos, já com a navegação do cabeçalho apontando
 * para elas. O organizador parte de uma página pronta e vai trocando.
 */
export function buildDefaultEventPageLayout(event) {
    const cover = typeof event.cover_image === 'string' ? event.cover_image : (event.cover_image?.id ?? null);
    const hero = eventPageHeroSchema.parse({
        id: newEventPageItemId(),
        anchor: 'inicio',
        hidden: false,
        type: 'hero',
        title: event.title,
        subtitle: event.short_description ?? undefined,
        image: cover,
    });
    const about = {
        id: newEventPageItemId(),
        anchor: 'sobre',
        hidden: false,
        type: 'about',
        title: 'Sobre o evento',
        content: event.description ?? '',
    };
    const tickets = eventPageTicketsSchema.parse({
        id: newEventPageItemId(),
        anchor: 'ingressos',
        hidden: false,
        type: 'tickets',
        title: 'Ingressos',
    });
    return eventPageLayoutSchema.parse({
        version: 1,
        theme: { mode: 'light', accent: null },
        header: {
            show: true,
            sticky: true,
            logo: null,
            useOrganizerLogo: true,
            title: event.title,
            nav: [
                { label: 'Sobre', anchor: 'sobre' },
                { label: 'Ingressos', anchor: 'ingressos' },
            ],
            ctaLabel: 'Comprar ingressos',
        },
        footer: { showOrganizer: true },
        sections: [hero, about, tickets],
    });
}
//# sourceMappingURL=event-page.js.map