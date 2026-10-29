import { z } from 'zod';
/**
 * Página exclusiva do evento.
 *
 * O organizador monta uma landing page com seções e um cabeçalho próprio, com
 * logo e navegação por âncoras. Não existem páginas internas: toda navegação
 * é `#âncora` dentro da própria página, e a seção de ingressos é obrigatória
 * porque é por ela que a pessoa chega ao checkout. O layout é um documento
 * JSON validado por este schema tanto no painel quanto na API.
 */
export declare const EVENT_PAGE_SECTION_TYPES: readonly ["hero", "about", "tickets", "schedule", "speakers", "location", "faq", "gallery", "sponsors", "cta", "countdown", "richtext"];
export type EventPageSectionType = (typeof EVENT_PAGE_SECTION_TYPES)[number];
/** Âncora de seção: minúsculas, números e hífens; vira `#âncora` na URL. */
export declare const eventPageAnchorSchema: z.ZodString;
export declare const eventPageHeroSchema: z.ZodObject<{
    type: z.ZodLiteral<"hero">;
    subtitle: z.ZodOptional<z.ZodString>;
    image: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    align: z.ZodDefault<z.ZodEnum<["left", "center"]>>;
    showDate: z.ZodDefault<z.ZodBoolean>;
    showLocation: z.ZodDefault<z.ZodBoolean>;
    ctaLabel: z.ZodDefault<z.ZodString>;
    id: z.ZodString;
    anchor: z.ZodString;
    hidden: z.ZodDefault<z.ZodBoolean>;
    title: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "hero";
    id: string;
    hidden: boolean;
    anchor: string;
    align: "left" | "center";
    showDate: boolean;
    showLocation: boolean;
    ctaLabel: string;
    title?: string | undefined;
    image?: string | null | undefined;
    subtitle?: string | undefined;
}, {
    type: "hero";
    id: string;
    anchor: string;
    title?: string | undefined;
    image?: string | null | undefined;
    hidden?: boolean | undefined;
    subtitle?: string | undefined;
    align?: "left" | "center" | undefined;
    showDate?: boolean | undefined;
    showLocation?: boolean | undefined;
    ctaLabel?: string | undefined;
}>;
export declare const eventPageAboutSchema: z.ZodObject<{
    type: z.ZodLiteral<"about">;
    content: z.ZodString;
    id: z.ZodString;
    anchor: z.ZodString;
    hidden: z.ZodDefault<z.ZodBoolean>;
    title: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "about";
    id: string;
    content: string;
    hidden: boolean;
    anchor: string;
    title?: string | undefined;
}, {
    type: "about";
    id: string;
    content: string;
    anchor: string;
    title?: string | undefined;
    hidden?: boolean | undefined;
}>;
export declare const eventPageTicketsSchema: z.ZodObject<{
    type: z.ZodLiteral<"tickets">;
    note: z.ZodOptional<z.ZodString>;
    ctaLabel: z.ZodDefault<z.ZodString>;
    id: z.ZodString;
    anchor: z.ZodString;
    hidden: z.ZodDefault<z.ZodBoolean>;
    title: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "tickets";
    id: string;
    hidden: boolean;
    anchor: string;
    ctaLabel: string;
    title?: string | undefined;
    note?: string | undefined;
}, {
    type: "tickets";
    id: string;
    anchor: string;
    title?: string | undefined;
    note?: string | undefined;
    hidden?: boolean | undefined;
    ctaLabel?: string | undefined;
}>;
export declare const eventPageScheduleSchema: z.ZodObject<{
    type: z.ZodLiteral<"schedule">;
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        time: z.ZodString;
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        speaker: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        id: string;
        time: string;
        description?: string | undefined;
        speaker?: string | undefined;
    }, {
        title: string;
        id: string;
        time: string;
        description?: string | undefined;
        speaker?: string | undefined;
    }>, "many">;
    id: z.ZodString;
    anchor: z.ZodString;
    hidden: z.ZodDefault<z.ZodBoolean>;
    title: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "schedule";
    id: string;
    items: {
        title: string;
        id: string;
        time: string;
        description?: string | undefined;
        speaker?: string | undefined;
    }[];
    hidden: boolean;
    anchor: string;
    title?: string | undefined;
}, {
    type: "schedule";
    id: string;
    items: {
        title: string;
        id: string;
        time: string;
        description?: string | undefined;
        speaker?: string | undefined;
    }[];
    anchor: string;
    title?: string | undefined;
    hidden?: boolean | undefined;
}>;
export declare const eventPageSpeakersSchema: z.ZodObject<{
    type: z.ZodLiteral<"speakers">;
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        role: z.ZodOptional<z.ZodString>;
        photo: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        bio: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        role?: string | undefined;
        photo?: string | null | undefined;
        bio?: string | undefined;
    }, {
        id: string;
        name: string;
        role?: string | undefined;
        photo?: string | null | undefined;
        bio?: string | undefined;
    }>, "many">;
    id: z.ZodString;
    anchor: z.ZodString;
    hidden: z.ZodDefault<z.ZodBoolean>;
    title: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "speakers";
    id: string;
    items: {
        id: string;
        name: string;
        role?: string | undefined;
        photo?: string | null | undefined;
        bio?: string | undefined;
    }[];
    hidden: boolean;
    anchor: string;
    title?: string | undefined;
}, {
    type: "speakers";
    id: string;
    items: {
        id: string;
        name: string;
        role?: string | undefined;
        photo?: string | null | undefined;
        bio?: string | undefined;
    }[];
    anchor: string;
    title?: string | undefined;
    hidden?: boolean | undefined;
}>;
export declare const eventPageLocationSchema: z.ZodObject<{
    type: z.ZodLiteral<"location">;
    note: z.ZodOptional<z.ZodString>;
    showMap: z.ZodDefault<z.ZodBoolean>;
    id: z.ZodString;
    anchor: z.ZodString;
    hidden: z.ZodDefault<z.ZodBoolean>;
    title: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "location";
    id: string;
    hidden: boolean;
    anchor: string;
    showMap: boolean;
    title?: string | undefined;
    note?: string | undefined;
}, {
    type: "location";
    id: string;
    anchor: string;
    title?: string | undefined;
    note?: string | undefined;
    hidden?: boolean | undefined;
    showMap?: boolean | undefined;
}>;
export declare const eventPageFaqSchema: z.ZodObject<{
    type: z.ZodLiteral<"faq">;
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        question: z.ZodString;
        answer: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        question: string;
        answer: string;
    }, {
        id: string;
        question: string;
        answer: string;
    }>, "many">;
    id: z.ZodString;
    anchor: z.ZodString;
    hidden: z.ZodDefault<z.ZodBoolean>;
    title: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "faq";
    id: string;
    items: {
        id: string;
        question: string;
        answer: string;
    }[];
    hidden: boolean;
    anchor: string;
    title?: string | undefined;
}, {
    type: "faq";
    id: string;
    items: {
        id: string;
        question: string;
        answer: string;
    }[];
    anchor: string;
    title?: string | undefined;
    hidden?: boolean | undefined;
}>;
export declare const eventPageGallerySchema: z.ZodObject<{
    type: z.ZodLiteral<"gallery">;
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        image: z.ZodString;
        caption: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        image: string;
        caption?: string | undefined;
    }, {
        id: string;
        image: string;
        caption?: string | undefined;
    }>, "many">;
    id: z.ZodString;
    anchor: z.ZodString;
    hidden: z.ZodDefault<z.ZodBoolean>;
    title: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "gallery";
    id: string;
    items: {
        id: string;
        image: string;
        caption?: string | undefined;
    }[];
    hidden: boolean;
    anchor: string;
    title?: string | undefined;
}, {
    type: "gallery";
    id: string;
    items: {
        id: string;
        image: string;
        caption?: string | undefined;
    }[];
    anchor: string;
    title?: string | undefined;
    hidden?: boolean | undefined;
}>;
export declare const eventPageSponsorsSchema: z.ZodObject<{
    type: z.ZodLiteral<"sponsors">;
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        logo: z.ZodString;
        url: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodString, string, string>>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        logo: string;
        url?: string | null | undefined;
    }, {
        id: string;
        name: string;
        logo: string;
        url?: string | null | undefined;
    }>, "many">;
    id: z.ZodString;
    anchor: z.ZodString;
    hidden: z.ZodDefault<z.ZodBoolean>;
    title: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "sponsors";
    id: string;
    items: {
        id: string;
        name: string;
        logo: string;
        url?: string | null | undefined;
    }[];
    hidden: boolean;
    anchor: string;
    title?: string | undefined;
}, {
    type: "sponsors";
    id: string;
    items: {
        id: string;
        name: string;
        logo: string;
        url?: string | null | undefined;
    }[];
    anchor: string;
    title?: string | undefined;
    hidden?: boolean | undefined;
}>;
export declare const eventPageCtaSchema: z.ZodObject<{
    type: z.ZodLiteral<"cta">;
    headline: z.ZodString;
    text: z.ZodOptional<z.ZodString>;
    buttonLabel: z.ZodDefault<z.ZodString>;
    /** `tickets` rola até a seção de ingressos; uma URL abre em nova aba. */
    target: z.ZodDefault<z.ZodUnion<[z.ZodLiteral<"tickets">, z.ZodEffects<z.ZodString, string, string>]>>;
    id: z.ZodString;
    anchor: z.ZodString;
    hidden: z.ZodDefault<z.ZodBoolean>;
    title: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "cta";
    id: string;
    headline: string;
    hidden: boolean;
    anchor: string;
    buttonLabel: string;
    target: string;
    title?: string | undefined;
    text?: string | undefined;
}, {
    type: "cta";
    id: string;
    headline: string;
    anchor: string;
    title?: string | undefined;
    text?: string | undefined;
    hidden?: boolean | undefined;
    buttonLabel?: string | undefined;
    target?: string | undefined;
}>;
export declare const eventPageCountdownSchema: z.ZodObject<{
    type: z.ZodLiteral<"countdown">;
    label: z.ZodOptional<z.ZodString>;
    id: z.ZodString;
    anchor: z.ZodString;
    hidden: z.ZodDefault<z.ZodBoolean>;
    title: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "countdown";
    id: string;
    hidden: boolean;
    anchor: string;
    title?: string | undefined;
    label?: string | undefined;
}, {
    type: "countdown";
    id: string;
    anchor: string;
    title?: string | undefined;
    label?: string | undefined;
    hidden?: boolean | undefined;
}>;
export declare const eventPageRichtextSchema: z.ZodObject<{
    type: z.ZodLiteral<"richtext">;
    content: z.ZodString;
    id: z.ZodString;
    anchor: z.ZodString;
    hidden: z.ZodDefault<z.ZodBoolean>;
    title: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "richtext";
    id: string;
    content: string;
    hidden: boolean;
    anchor: string;
    title?: string | undefined;
}, {
    type: "richtext";
    id: string;
    content: string;
    anchor: string;
    title?: string | undefined;
    hidden?: boolean | undefined;
}>;
export declare const eventPageSectionSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"hero">;
    subtitle: z.ZodOptional<z.ZodString>;
    image: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    align: z.ZodDefault<z.ZodEnum<["left", "center"]>>;
    showDate: z.ZodDefault<z.ZodBoolean>;
    showLocation: z.ZodDefault<z.ZodBoolean>;
    ctaLabel: z.ZodDefault<z.ZodString>;
    id: z.ZodString;
    anchor: z.ZodString;
    hidden: z.ZodDefault<z.ZodBoolean>;
    title: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "hero";
    id: string;
    hidden: boolean;
    anchor: string;
    align: "left" | "center";
    showDate: boolean;
    showLocation: boolean;
    ctaLabel: string;
    title?: string | undefined;
    image?: string | null | undefined;
    subtitle?: string | undefined;
}, {
    type: "hero";
    id: string;
    anchor: string;
    title?: string | undefined;
    image?: string | null | undefined;
    hidden?: boolean | undefined;
    subtitle?: string | undefined;
    align?: "left" | "center" | undefined;
    showDate?: boolean | undefined;
    showLocation?: boolean | undefined;
    ctaLabel?: string | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"about">;
    content: z.ZodString;
    id: z.ZodString;
    anchor: z.ZodString;
    hidden: z.ZodDefault<z.ZodBoolean>;
    title: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "about";
    id: string;
    content: string;
    hidden: boolean;
    anchor: string;
    title?: string | undefined;
}, {
    type: "about";
    id: string;
    content: string;
    anchor: string;
    title?: string | undefined;
    hidden?: boolean | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"tickets">;
    note: z.ZodOptional<z.ZodString>;
    ctaLabel: z.ZodDefault<z.ZodString>;
    id: z.ZodString;
    anchor: z.ZodString;
    hidden: z.ZodDefault<z.ZodBoolean>;
    title: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "tickets";
    id: string;
    hidden: boolean;
    anchor: string;
    ctaLabel: string;
    title?: string | undefined;
    note?: string | undefined;
}, {
    type: "tickets";
    id: string;
    anchor: string;
    title?: string | undefined;
    note?: string | undefined;
    hidden?: boolean | undefined;
    ctaLabel?: string | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"schedule">;
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        time: z.ZodString;
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        speaker: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        id: string;
        time: string;
        description?: string | undefined;
        speaker?: string | undefined;
    }, {
        title: string;
        id: string;
        time: string;
        description?: string | undefined;
        speaker?: string | undefined;
    }>, "many">;
    id: z.ZodString;
    anchor: z.ZodString;
    hidden: z.ZodDefault<z.ZodBoolean>;
    title: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "schedule";
    id: string;
    items: {
        title: string;
        id: string;
        time: string;
        description?: string | undefined;
        speaker?: string | undefined;
    }[];
    hidden: boolean;
    anchor: string;
    title?: string | undefined;
}, {
    type: "schedule";
    id: string;
    items: {
        title: string;
        id: string;
        time: string;
        description?: string | undefined;
        speaker?: string | undefined;
    }[];
    anchor: string;
    title?: string | undefined;
    hidden?: boolean | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"speakers">;
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        role: z.ZodOptional<z.ZodString>;
        photo: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        bio: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        role?: string | undefined;
        photo?: string | null | undefined;
        bio?: string | undefined;
    }, {
        id: string;
        name: string;
        role?: string | undefined;
        photo?: string | null | undefined;
        bio?: string | undefined;
    }>, "many">;
    id: z.ZodString;
    anchor: z.ZodString;
    hidden: z.ZodDefault<z.ZodBoolean>;
    title: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "speakers";
    id: string;
    items: {
        id: string;
        name: string;
        role?: string | undefined;
        photo?: string | null | undefined;
        bio?: string | undefined;
    }[];
    hidden: boolean;
    anchor: string;
    title?: string | undefined;
}, {
    type: "speakers";
    id: string;
    items: {
        id: string;
        name: string;
        role?: string | undefined;
        photo?: string | null | undefined;
        bio?: string | undefined;
    }[];
    anchor: string;
    title?: string | undefined;
    hidden?: boolean | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"location">;
    note: z.ZodOptional<z.ZodString>;
    showMap: z.ZodDefault<z.ZodBoolean>;
    id: z.ZodString;
    anchor: z.ZodString;
    hidden: z.ZodDefault<z.ZodBoolean>;
    title: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "location";
    id: string;
    hidden: boolean;
    anchor: string;
    showMap: boolean;
    title?: string | undefined;
    note?: string | undefined;
}, {
    type: "location";
    id: string;
    anchor: string;
    title?: string | undefined;
    note?: string | undefined;
    hidden?: boolean | undefined;
    showMap?: boolean | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"faq">;
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        question: z.ZodString;
        answer: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        question: string;
        answer: string;
    }, {
        id: string;
        question: string;
        answer: string;
    }>, "many">;
    id: z.ZodString;
    anchor: z.ZodString;
    hidden: z.ZodDefault<z.ZodBoolean>;
    title: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "faq";
    id: string;
    items: {
        id: string;
        question: string;
        answer: string;
    }[];
    hidden: boolean;
    anchor: string;
    title?: string | undefined;
}, {
    type: "faq";
    id: string;
    items: {
        id: string;
        question: string;
        answer: string;
    }[];
    anchor: string;
    title?: string | undefined;
    hidden?: boolean | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"gallery">;
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        image: z.ZodString;
        caption: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        image: string;
        caption?: string | undefined;
    }, {
        id: string;
        image: string;
        caption?: string | undefined;
    }>, "many">;
    id: z.ZodString;
    anchor: z.ZodString;
    hidden: z.ZodDefault<z.ZodBoolean>;
    title: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "gallery";
    id: string;
    items: {
        id: string;
        image: string;
        caption?: string | undefined;
    }[];
    hidden: boolean;
    anchor: string;
    title?: string | undefined;
}, {
    type: "gallery";
    id: string;
    items: {
        id: string;
        image: string;
        caption?: string | undefined;
    }[];
    anchor: string;
    title?: string | undefined;
    hidden?: boolean | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"sponsors">;
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        logo: z.ZodString;
        url: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodString, string, string>>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        logo: string;
        url?: string | null | undefined;
    }, {
        id: string;
        name: string;
        logo: string;
        url?: string | null | undefined;
    }>, "many">;
    id: z.ZodString;
    anchor: z.ZodString;
    hidden: z.ZodDefault<z.ZodBoolean>;
    title: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "sponsors";
    id: string;
    items: {
        id: string;
        name: string;
        logo: string;
        url?: string | null | undefined;
    }[];
    hidden: boolean;
    anchor: string;
    title?: string | undefined;
}, {
    type: "sponsors";
    id: string;
    items: {
        id: string;
        name: string;
        logo: string;
        url?: string | null | undefined;
    }[];
    anchor: string;
    title?: string | undefined;
    hidden?: boolean | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"cta">;
    headline: z.ZodString;
    text: z.ZodOptional<z.ZodString>;
    buttonLabel: z.ZodDefault<z.ZodString>;
    /** `tickets` rola até a seção de ingressos; uma URL abre em nova aba. */
    target: z.ZodDefault<z.ZodUnion<[z.ZodLiteral<"tickets">, z.ZodEffects<z.ZodString, string, string>]>>;
    id: z.ZodString;
    anchor: z.ZodString;
    hidden: z.ZodDefault<z.ZodBoolean>;
    title: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "cta";
    id: string;
    headline: string;
    hidden: boolean;
    anchor: string;
    buttonLabel: string;
    target: string;
    title?: string | undefined;
    text?: string | undefined;
}, {
    type: "cta";
    id: string;
    headline: string;
    anchor: string;
    title?: string | undefined;
    text?: string | undefined;
    hidden?: boolean | undefined;
    buttonLabel?: string | undefined;
    target?: string | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"countdown">;
    label: z.ZodOptional<z.ZodString>;
    id: z.ZodString;
    anchor: z.ZodString;
    hidden: z.ZodDefault<z.ZodBoolean>;
    title: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "countdown";
    id: string;
    hidden: boolean;
    anchor: string;
    title?: string | undefined;
    label?: string | undefined;
}, {
    type: "countdown";
    id: string;
    anchor: string;
    title?: string | undefined;
    label?: string | undefined;
    hidden?: boolean | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"richtext">;
    content: z.ZodString;
    id: z.ZodString;
    anchor: z.ZodString;
    hidden: z.ZodDefault<z.ZodBoolean>;
    title: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "richtext";
    id: string;
    content: string;
    hidden: boolean;
    anchor: string;
    title?: string | undefined;
}, {
    type: "richtext";
    id: string;
    content: string;
    anchor: string;
    title?: string | undefined;
    hidden?: boolean | undefined;
}>]>;
export type EventPageSection = z.infer<typeof eventPageSectionSchema>;
export declare const eventPageNavItemSchema: z.ZodObject<{
    label: z.ZodString;
    /** Só âncoras da própria página: a landing não tem páginas internas. */
    anchor: z.ZodString;
}, "strip", z.ZodTypeAny, {
    label: string;
    anchor: string;
}, {
    label: string;
    anchor: string;
}>;
export declare const eventPageHeaderSchema: z.ZodObject<{
    show: z.ZodDefault<z.ZodBoolean>;
    sticky: z.ZodDefault<z.ZodBoolean>;
    /** Logo própria; sem ela, usa a do organizador quando `useOrganizerLogo`. */
    logo: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    useOrganizerLogo: z.ZodDefault<z.ZodBoolean>;
    title: z.ZodOptional<z.ZodString>;
    nav: z.ZodDefault<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        /** Só âncoras da própria página: a landing não tem páginas internas. */
        anchor: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        label: string;
        anchor: string;
    }, {
        label: string;
        anchor: string;
    }>, "many">>;
    ctaLabel: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    ctaLabel: string;
    show: boolean;
    sticky: boolean;
    useOrganizerLogo: boolean;
    nav: {
        label: string;
        anchor: string;
    }[];
    title?: string | undefined;
    logo?: string | null | undefined;
}, {
    title?: string | undefined;
    logo?: string | null | undefined;
    ctaLabel?: string | undefined;
    show?: boolean | undefined;
    sticky?: boolean | undefined;
    useOrganizerLogo?: boolean | undefined;
    nav?: {
        label: string;
        anchor: string;
    }[] | undefined;
}>;
export declare const eventPageThemeSchema: z.ZodObject<{
    mode: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
    accent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    mode: "light" | "dark";
    accent?: string | null | undefined;
}, {
    mode?: "light" | "dark" | undefined;
    accent?: string | null | undefined;
}>;
export declare const eventPageFooterSchema: z.ZodObject<{
    showOrganizer: z.ZodDefault<z.ZodBoolean>;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    showOrganizer: boolean;
    note?: string | undefined;
}, {
    note?: string | undefined;
    showOrganizer?: boolean | undefined;
}>;
export declare const eventPageLayoutSchema: z.ZodObject<{
    version: z.ZodLiteral<1>;
    theme: z.ZodDefault<z.ZodObject<{
        mode: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
        accent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        mode: "light" | "dark";
        accent?: string | null | undefined;
    }, {
        mode?: "light" | "dark" | undefined;
        accent?: string | null | undefined;
    }>>;
    header: z.ZodObject<{
        show: z.ZodDefault<z.ZodBoolean>;
        sticky: z.ZodDefault<z.ZodBoolean>;
        /** Logo própria; sem ela, usa a do organizador quando `useOrganizerLogo`. */
        logo: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        useOrganizerLogo: z.ZodDefault<z.ZodBoolean>;
        title: z.ZodOptional<z.ZodString>;
        nav: z.ZodDefault<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            /** Só âncoras da própria página: a landing não tem páginas internas. */
            anchor: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            label: string;
            anchor: string;
        }, {
            label: string;
            anchor: string;
        }>, "many">>;
        ctaLabel: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        ctaLabel: string;
        show: boolean;
        sticky: boolean;
        useOrganizerLogo: boolean;
        nav: {
            label: string;
            anchor: string;
        }[];
        title?: string | undefined;
        logo?: string | null | undefined;
    }, {
        title?: string | undefined;
        logo?: string | null | undefined;
        ctaLabel?: string | undefined;
        show?: boolean | undefined;
        sticky?: boolean | undefined;
        useOrganizerLogo?: boolean | undefined;
        nav?: {
            label: string;
            anchor: string;
        }[] | undefined;
    }>;
    footer: z.ZodDefault<z.ZodObject<{
        showOrganizer: z.ZodDefault<z.ZodBoolean>;
        note: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        showOrganizer: boolean;
        note?: string | undefined;
    }, {
        note?: string | undefined;
        showOrganizer?: boolean | undefined;
    }>>;
    sections: z.ZodArray<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"hero">;
        subtitle: z.ZodOptional<z.ZodString>;
        image: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        align: z.ZodDefault<z.ZodEnum<["left", "center"]>>;
        showDate: z.ZodDefault<z.ZodBoolean>;
        showLocation: z.ZodDefault<z.ZodBoolean>;
        ctaLabel: z.ZodDefault<z.ZodString>;
        id: z.ZodString;
        anchor: z.ZodString;
        hidden: z.ZodDefault<z.ZodBoolean>;
        title: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "hero";
        id: string;
        hidden: boolean;
        anchor: string;
        align: "left" | "center";
        showDate: boolean;
        showLocation: boolean;
        ctaLabel: string;
        title?: string | undefined;
        image?: string | null | undefined;
        subtitle?: string | undefined;
    }, {
        type: "hero";
        id: string;
        anchor: string;
        title?: string | undefined;
        image?: string | null | undefined;
        hidden?: boolean | undefined;
        subtitle?: string | undefined;
        align?: "left" | "center" | undefined;
        showDate?: boolean | undefined;
        showLocation?: boolean | undefined;
        ctaLabel?: string | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"about">;
        content: z.ZodString;
        id: z.ZodString;
        anchor: z.ZodString;
        hidden: z.ZodDefault<z.ZodBoolean>;
        title: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "about";
        id: string;
        content: string;
        hidden: boolean;
        anchor: string;
        title?: string | undefined;
    }, {
        type: "about";
        id: string;
        content: string;
        anchor: string;
        title?: string | undefined;
        hidden?: boolean | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"tickets">;
        note: z.ZodOptional<z.ZodString>;
        ctaLabel: z.ZodDefault<z.ZodString>;
        id: z.ZodString;
        anchor: z.ZodString;
        hidden: z.ZodDefault<z.ZodBoolean>;
        title: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "tickets";
        id: string;
        hidden: boolean;
        anchor: string;
        ctaLabel: string;
        title?: string | undefined;
        note?: string | undefined;
    }, {
        type: "tickets";
        id: string;
        anchor: string;
        title?: string | undefined;
        note?: string | undefined;
        hidden?: boolean | undefined;
        ctaLabel?: string | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"schedule">;
        items: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            time: z.ZodString;
            title: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            speaker: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            title: string;
            id: string;
            time: string;
            description?: string | undefined;
            speaker?: string | undefined;
        }, {
            title: string;
            id: string;
            time: string;
            description?: string | undefined;
            speaker?: string | undefined;
        }>, "many">;
        id: z.ZodString;
        anchor: z.ZodString;
        hidden: z.ZodDefault<z.ZodBoolean>;
        title: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "schedule";
        id: string;
        items: {
            title: string;
            id: string;
            time: string;
            description?: string | undefined;
            speaker?: string | undefined;
        }[];
        hidden: boolean;
        anchor: string;
        title?: string | undefined;
    }, {
        type: "schedule";
        id: string;
        items: {
            title: string;
            id: string;
            time: string;
            description?: string | undefined;
            speaker?: string | undefined;
        }[];
        anchor: string;
        title?: string | undefined;
        hidden?: boolean | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"speakers">;
        items: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            role: z.ZodOptional<z.ZodString>;
            photo: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            bio: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            role?: string | undefined;
            photo?: string | null | undefined;
            bio?: string | undefined;
        }, {
            id: string;
            name: string;
            role?: string | undefined;
            photo?: string | null | undefined;
            bio?: string | undefined;
        }>, "many">;
        id: z.ZodString;
        anchor: z.ZodString;
        hidden: z.ZodDefault<z.ZodBoolean>;
        title: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "speakers";
        id: string;
        items: {
            id: string;
            name: string;
            role?: string | undefined;
            photo?: string | null | undefined;
            bio?: string | undefined;
        }[];
        hidden: boolean;
        anchor: string;
        title?: string | undefined;
    }, {
        type: "speakers";
        id: string;
        items: {
            id: string;
            name: string;
            role?: string | undefined;
            photo?: string | null | undefined;
            bio?: string | undefined;
        }[];
        anchor: string;
        title?: string | undefined;
        hidden?: boolean | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"location">;
        note: z.ZodOptional<z.ZodString>;
        showMap: z.ZodDefault<z.ZodBoolean>;
        id: z.ZodString;
        anchor: z.ZodString;
        hidden: z.ZodDefault<z.ZodBoolean>;
        title: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "location";
        id: string;
        hidden: boolean;
        anchor: string;
        showMap: boolean;
        title?: string | undefined;
        note?: string | undefined;
    }, {
        type: "location";
        id: string;
        anchor: string;
        title?: string | undefined;
        note?: string | undefined;
        hidden?: boolean | undefined;
        showMap?: boolean | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"faq">;
        items: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            question: z.ZodString;
            answer: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            question: string;
            answer: string;
        }, {
            id: string;
            question: string;
            answer: string;
        }>, "many">;
        id: z.ZodString;
        anchor: z.ZodString;
        hidden: z.ZodDefault<z.ZodBoolean>;
        title: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "faq";
        id: string;
        items: {
            id: string;
            question: string;
            answer: string;
        }[];
        hidden: boolean;
        anchor: string;
        title?: string | undefined;
    }, {
        type: "faq";
        id: string;
        items: {
            id: string;
            question: string;
            answer: string;
        }[];
        anchor: string;
        title?: string | undefined;
        hidden?: boolean | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"gallery">;
        items: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            image: z.ZodString;
            caption: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            image: string;
            caption?: string | undefined;
        }, {
            id: string;
            image: string;
            caption?: string | undefined;
        }>, "many">;
        id: z.ZodString;
        anchor: z.ZodString;
        hidden: z.ZodDefault<z.ZodBoolean>;
        title: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "gallery";
        id: string;
        items: {
            id: string;
            image: string;
            caption?: string | undefined;
        }[];
        hidden: boolean;
        anchor: string;
        title?: string | undefined;
    }, {
        type: "gallery";
        id: string;
        items: {
            id: string;
            image: string;
            caption?: string | undefined;
        }[];
        anchor: string;
        title?: string | undefined;
        hidden?: boolean | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"sponsors">;
        items: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            logo: z.ZodString;
            url: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodString, string, string>>>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            logo: string;
            url?: string | null | undefined;
        }, {
            id: string;
            name: string;
            logo: string;
            url?: string | null | undefined;
        }>, "many">;
        id: z.ZodString;
        anchor: z.ZodString;
        hidden: z.ZodDefault<z.ZodBoolean>;
        title: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "sponsors";
        id: string;
        items: {
            id: string;
            name: string;
            logo: string;
            url?: string | null | undefined;
        }[];
        hidden: boolean;
        anchor: string;
        title?: string | undefined;
    }, {
        type: "sponsors";
        id: string;
        items: {
            id: string;
            name: string;
            logo: string;
            url?: string | null | undefined;
        }[];
        anchor: string;
        title?: string | undefined;
        hidden?: boolean | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"cta">;
        headline: z.ZodString;
        text: z.ZodOptional<z.ZodString>;
        buttonLabel: z.ZodDefault<z.ZodString>;
        /** `tickets` rola até a seção de ingressos; uma URL abre em nova aba. */
        target: z.ZodDefault<z.ZodUnion<[z.ZodLiteral<"tickets">, z.ZodEffects<z.ZodString, string, string>]>>;
        id: z.ZodString;
        anchor: z.ZodString;
        hidden: z.ZodDefault<z.ZodBoolean>;
        title: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "cta";
        id: string;
        headline: string;
        hidden: boolean;
        anchor: string;
        buttonLabel: string;
        target: string;
        title?: string | undefined;
        text?: string | undefined;
    }, {
        type: "cta";
        id: string;
        headline: string;
        anchor: string;
        title?: string | undefined;
        text?: string | undefined;
        hidden?: boolean | undefined;
        buttonLabel?: string | undefined;
        target?: string | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"countdown">;
        label: z.ZodOptional<z.ZodString>;
        id: z.ZodString;
        anchor: z.ZodString;
        hidden: z.ZodDefault<z.ZodBoolean>;
        title: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "countdown";
        id: string;
        hidden: boolean;
        anchor: string;
        title?: string | undefined;
        label?: string | undefined;
    }, {
        type: "countdown";
        id: string;
        anchor: string;
        title?: string | undefined;
        label?: string | undefined;
        hidden?: boolean | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"richtext">;
        content: z.ZodString;
        id: z.ZodString;
        anchor: z.ZodString;
        hidden: z.ZodDefault<z.ZodBoolean>;
        title: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "richtext";
        id: string;
        content: string;
        hidden: boolean;
        anchor: string;
        title?: string | undefined;
    }, {
        type: "richtext";
        id: string;
        content: string;
        anchor: string;
        title?: string | undefined;
        hidden?: boolean | undefined;
    }>]>, "many">;
}, "strip", z.ZodTypeAny, {
    version: 1;
    theme: {
        mode: "light" | "dark";
        accent?: string | null | undefined;
    };
    header: {
        ctaLabel: string;
        show: boolean;
        sticky: boolean;
        useOrganizerLogo: boolean;
        nav: {
            label: string;
            anchor: string;
        }[];
        title?: string | undefined;
        logo?: string | null | undefined;
    };
    footer: {
        showOrganizer: boolean;
        note?: string | undefined;
    };
    sections: ({
        type: "hero";
        id: string;
        hidden: boolean;
        anchor: string;
        align: "left" | "center";
        showDate: boolean;
        showLocation: boolean;
        ctaLabel: string;
        title?: string | undefined;
        image?: string | null | undefined;
        subtitle?: string | undefined;
    } | {
        type: "about";
        id: string;
        content: string;
        hidden: boolean;
        anchor: string;
        title?: string | undefined;
    } | {
        type: "tickets";
        id: string;
        hidden: boolean;
        anchor: string;
        ctaLabel: string;
        title?: string | undefined;
        note?: string | undefined;
    } | {
        type: "schedule";
        id: string;
        items: {
            title: string;
            id: string;
            time: string;
            description?: string | undefined;
            speaker?: string | undefined;
        }[];
        hidden: boolean;
        anchor: string;
        title?: string | undefined;
    } | {
        type: "speakers";
        id: string;
        items: {
            id: string;
            name: string;
            role?: string | undefined;
            photo?: string | null | undefined;
            bio?: string | undefined;
        }[];
        hidden: boolean;
        anchor: string;
        title?: string | undefined;
    } | {
        type: "location";
        id: string;
        hidden: boolean;
        anchor: string;
        showMap: boolean;
        title?: string | undefined;
        note?: string | undefined;
    } | {
        type: "faq";
        id: string;
        items: {
            id: string;
            question: string;
            answer: string;
        }[];
        hidden: boolean;
        anchor: string;
        title?: string | undefined;
    } | {
        type: "gallery";
        id: string;
        items: {
            id: string;
            image: string;
            caption?: string | undefined;
        }[];
        hidden: boolean;
        anchor: string;
        title?: string | undefined;
    } | {
        type: "sponsors";
        id: string;
        items: {
            id: string;
            name: string;
            logo: string;
            url?: string | null | undefined;
        }[];
        hidden: boolean;
        anchor: string;
        title?: string | undefined;
    } | {
        type: "cta";
        id: string;
        headline: string;
        hidden: boolean;
        anchor: string;
        buttonLabel: string;
        target: string;
        title?: string | undefined;
        text?: string | undefined;
    } | {
        type: "countdown";
        id: string;
        hidden: boolean;
        anchor: string;
        title?: string | undefined;
        label?: string | undefined;
    } | {
        type: "richtext";
        id: string;
        content: string;
        hidden: boolean;
        anchor: string;
        title?: string | undefined;
    })[];
}, {
    version: 1;
    header: {
        title?: string | undefined;
        logo?: string | null | undefined;
        ctaLabel?: string | undefined;
        show?: boolean | undefined;
        sticky?: boolean | undefined;
        useOrganizerLogo?: boolean | undefined;
        nav?: {
            label: string;
            anchor: string;
        }[] | undefined;
    };
    sections: ({
        type: "hero";
        id: string;
        anchor: string;
        title?: string | undefined;
        image?: string | null | undefined;
        hidden?: boolean | undefined;
        subtitle?: string | undefined;
        align?: "left" | "center" | undefined;
        showDate?: boolean | undefined;
        showLocation?: boolean | undefined;
        ctaLabel?: string | undefined;
    } | {
        type: "about";
        id: string;
        content: string;
        anchor: string;
        title?: string | undefined;
        hidden?: boolean | undefined;
    } | {
        type: "tickets";
        id: string;
        anchor: string;
        title?: string | undefined;
        note?: string | undefined;
        hidden?: boolean | undefined;
        ctaLabel?: string | undefined;
    } | {
        type: "schedule";
        id: string;
        items: {
            title: string;
            id: string;
            time: string;
            description?: string | undefined;
            speaker?: string | undefined;
        }[];
        anchor: string;
        title?: string | undefined;
        hidden?: boolean | undefined;
    } | {
        type: "speakers";
        id: string;
        items: {
            id: string;
            name: string;
            role?: string | undefined;
            photo?: string | null | undefined;
            bio?: string | undefined;
        }[];
        anchor: string;
        title?: string | undefined;
        hidden?: boolean | undefined;
    } | {
        type: "location";
        id: string;
        anchor: string;
        title?: string | undefined;
        note?: string | undefined;
        hidden?: boolean | undefined;
        showMap?: boolean | undefined;
    } | {
        type: "faq";
        id: string;
        items: {
            id: string;
            question: string;
            answer: string;
        }[];
        anchor: string;
        title?: string | undefined;
        hidden?: boolean | undefined;
    } | {
        type: "gallery";
        id: string;
        items: {
            id: string;
            image: string;
            caption?: string | undefined;
        }[];
        anchor: string;
        title?: string | undefined;
        hidden?: boolean | undefined;
    } | {
        type: "sponsors";
        id: string;
        items: {
            id: string;
            name: string;
            logo: string;
            url?: string | null | undefined;
        }[];
        anchor: string;
        title?: string | undefined;
        hidden?: boolean | undefined;
    } | {
        type: "cta";
        id: string;
        headline: string;
        anchor: string;
        title?: string | undefined;
        text?: string | undefined;
        hidden?: boolean | undefined;
        buttonLabel?: string | undefined;
        target?: string | undefined;
    } | {
        type: "countdown";
        id: string;
        anchor: string;
        title?: string | undefined;
        label?: string | undefined;
        hidden?: boolean | undefined;
    } | {
        type: "richtext";
        id: string;
        content: string;
        anchor: string;
        title?: string | undefined;
        hidden?: boolean | undefined;
    })[];
    theme?: {
        mode?: "light" | "dark" | undefined;
        accent?: string | null | undefined;
    } | undefined;
    footer?: {
        note?: string | undefined;
        showOrganizer?: boolean | undefined;
    } | undefined;
}>;
export type EventPageLayout = z.infer<typeof eventPageLayoutSchema>;
export type EventPageHeader = z.infer<typeof eventPageHeaderSchema>;
/** Registro da página, como a API devolve ao organizador. */
export interface EventPageRecord {
    event_id: string;
    /** A página publicada substitui o layout padrão do evento. */
    enabled: boolean;
    draft: EventPageLayout;
    published: EventPageLayout | null;
    published_at: string | null;
    date_updated: string;
}
export interface EventPageIssue {
    code: 'tickets_required' | 'tickets_hidden' | 'duplicate_anchor' | 'nav_anchor_missing';
    message: string;
    path: Array<string | number>;
}
/**
 * Regras que atravessam seções, além do schema: uma seção de ingressos
 * visível, âncoras únicas e navegação apontando para âncoras existentes.
 * Devolve a lista de problemas; vazia significa publicável.
 */
export declare function validateEventPageLayout(layout: EventPageLayout): EventPageIssue[];
export declare function newEventPageItemId(): string;
/** Rótulos e âncoras padrão de cada tipo de seção, para o painel e o layout inicial. */
export declare const EVENT_PAGE_SECTION_META: Record<EventPageSectionType, {
    label: string;
    anchor: string;
    description: string;
}>;
/** Âncora livre para uma nova seção do tipo dado, evitando as já usadas. */
export declare function nextEventPageAnchor(type: EventPageSectionType, taken: Iterable<string>): string;
/** Uma seção nova do tipo dado, com os valores padrão do schema. */
export declare function buildEventPageSection(type: EventPageSectionType, taken?: Iterable<string>): EventPageSection;
export interface EventPageSeed {
    title: string;
    description?: string | null;
    short_description?: string | null;
    cover_image?: string | {
        id: string;
    } | null;
    start_date?: string | null;
}
/**
 * Layout inicial a partir do próprio evento: destaque com a capa, "Sobre" com a
 * descrição e a seção de ingressos, já com a navegação do cabeçalho apontando
 * para elas. O organizador parte de uma página pronta e vai trocando.
 */
export declare function buildDefaultEventPageLayout(event: EventPageSeed): EventPageLayout;
//# sourceMappingURL=event-page.d.ts.map