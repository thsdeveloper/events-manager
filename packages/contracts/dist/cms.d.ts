import { z } from 'zod';
/**
 * Contratos do CMS: o que o painel do superadmin envia para a API ao gerenciar
 * páginas, blocos, menus, posts, formulários, redirecionamentos e a identidade
 * do site. As mesmas regras valem no formulário (feedback imediato) e na rota
 * (fronteira de segurança); por isso vivem aqui e não em cada aplicação.
 */
/**
 * Prefixos que o App Router já resolve com rotas próprias. Uma página do CMS
 * com um destes caminhos nunca seria exibida (a rota estática vence a
 * catch-all), então o painel recusa em vez de deixar a pessoa publicar algo
 * invisível.
 */
export declare const RESERVED_PERMALINK_PREFIXES: readonly ["/admin", "/super-admin", "/perfil", "/login", "/cadastro", "/recuperar-senha", "/redefinir-senha", "/api", "/eventos", "/blog", "/taxas", "/my-registrations", "/examples", "/_next", "/sitemap.xml", "/robots.txt"];
export declare function slugify(value: string): string;
/** Converte um título ou caminho digitado em um permalink canônico. */
export declare function normalizePermalink(value: string): string;
export declare function isReservedPermalink(permalink: string): boolean;
export declare const permalinkSchema: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
export declare const slugSchema: z.ZodString;
export declare const cmsContentStatusSchema: z.ZodEnum<["draft", "in_review", "published"]>;
export type CmsContentStatus = z.infer<typeof cmsContentStatusSchema>;
export declare const cmsSeoSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    meta_description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    og_image: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    canonical_url: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodString, string, string>>>;
    no_index: z.ZodDefault<z.ZodBoolean>;
    no_follow: z.ZodDefault<z.ZodBoolean>;
    sitemap: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        change_frequency: z.ZodEnum<["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"]>;
        priority: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        change_frequency: "never" | "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly";
        priority: number;
    }, {
        change_frequency: "never" | "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly";
        priority: number;
    }>>>;
}, "strip", z.ZodTypeAny, {
    no_index: boolean;
    no_follow: boolean;
    title?: string | null | undefined;
    meta_description?: string | null | undefined;
    og_image?: string | null | undefined;
    canonical_url?: string | null | undefined;
    sitemap?: {
        change_frequency: "never" | "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly";
        priority: number;
    } | null | undefined;
}, {
    title?: string | null | undefined;
    meta_description?: string | null | undefined;
    og_image?: string | null | undefined;
    canonical_url?: string | null | undefined;
    no_index?: boolean | undefined;
    no_follow?: boolean | undefined;
    sitemap?: {
        change_frequency: "never" | "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly";
        priority: number;
    } | null | undefined;
}>;
export type CmsSeo = z.infer<typeof cmsSeoSchema>;
export declare const cmsPageInputSchema: z.ZodObject<{
    title: z.ZodString;
    permalink: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
    status: z.ZodDefault<z.ZodEnum<["draft", "in_review", "published"]>>;
    published_at: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    seo: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        meta_description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        og_image: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        canonical_url: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodString, string, string>>>;
        no_index: z.ZodDefault<z.ZodBoolean>;
        no_follow: z.ZodDefault<z.ZodBoolean>;
        sitemap: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            change_frequency: z.ZodEnum<["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"]>;
            priority: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            change_frequency: "never" | "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly";
            priority: number;
        }, {
            change_frequency: "never" | "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly";
            priority: number;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        no_index: boolean;
        no_follow: boolean;
        title?: string | null | undefined;
        meta_description?: string | null | undefined;
        og_image?: string | null | undefined;
        canonical_url?: string | null | undefined;
        sitemap?: {
            change_frequency: "never" | "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly";
            priority: number;
        } | null | undefined;
    }, {
        title?: string | null | undefined;
        meta_description?: string | null | undefined;
        og_image?: string | null | undefined;
        canonical_url?: string | null | undefined;
        no_index?: boolean | undefined;
        no_follow?: boolean | undefined;
        sitemap?: {
            change_frequency: "never" | "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly";
            priority: number;
        } | null | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "in_review" | "published";
    title: string;
    permalink: string;
    published_at: string | null;
    seo?: {
        no_index: boolean;
        no_follow: boolean;
        title?: string | null | undefined;
        meta_description?: string | null | undefined;
        og_image?: string | null | undefined;
        canonical_url?: string | null | undefined;
        sitemap?: {
            change_frequency: "never" | "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly";
            priority: number;
        } | null | undefined;
    } | null | undefined;
}, {
    title: string;
    permalink: string;
    status?: "draft" | "in_review" | "published" | undefined;
    published_at?: string | null | undefined;
    seo?: {
        title?: string | null | undefined;
        meta_description?: string | null | undefined;
        og_image?: string | null | undefined;
        canonical_url?: string | null | undefined;
        no_index?: boolean | undefined;
        no_follow?: boolean | undefined;
        sitemap?: {
            change_frequency: "never" | "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly";
            priority: number;
        } | null | undefined;
    } | null | undefined;
}>;
export type CmsPageInput = z.infer<typeof cmsPageInputSchema>;
export declare const CMS_BLOCK_COLLECTIONS: readonly ["block_hero", "block_richtext", "block_gallery", "block_pricing", "block_posts", "block_events", "block_form"];
export type CmsBlockCollection = (typeof CMS_BLOCK_COLLECTIONS)[number];
export declare const cmsButtonInputSchema: z.ZodEffects<z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    label: z.ZodString;
    type: z.ZodDefault<z.ZodEnum<["url", "page", "post"]>>;
    url: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodString, string, string>>>;
    page: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    post: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    variant: z.ZodDefault<z.ZodEnum<["default", "outline", "soft", "ghost", "link"]>>;
}, "strip", z.ZodTypeAny, {
    type: "url" | "page" | "post";
    label: string;
    variant: "default" | "outline" | "soft" | "ghost" | "link";
    id?: string | undefined;
    url?: string | null | undefined;
    page?: string | null | undefined;
    post?: string | null | undefined;
}, {
    label: string;
    type?: "url" | "page" | "post" | undefined;
    id?: string | undefined;
    url?: string | null | undefined;
    page?: string | null | undefined;
    post?: string | null | undefined;
    variant?: "default" | "outline" | "soft" | "ghost" | "link" | undefined;
}>, {
    type: "url" | "page" | "post";
    label: string;
    variant: "default" | "outline" | "soft" | "ghost" | "link";
    id?: string | undefined;
    url?: string | null | undefined;
    page?: string | null | undefined;
    post?: string | null | undefined;
}, {
    label: string;
    type?: "url" | "page" | "post" | undefined;
    id?: string | undefined;
    url?: string | null | undefined;
    page?: string | null | undefined;
    post?: string | null | undefined;
    variant?: "default" | "outline" | "soft" | "ghost" | "link" | undefined;
}>;
export type CmsButtonInput = z.infer<typeof cmsButtonInputSchema>;
export declare const cmsHeroItemSchema: z.ZodObject<{
    tagline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    headline: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    image: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    layout: z.ZodDefault<z.ZodEnum<["image_left", "image_center", "image_right"]>>;
    buttons: z.ZodDefault<z.ZodArray<z.ZodEffects<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        label: z.ZodString;
        type: z.ZodDefault<z.ZodEnum<["url", "page", "post"]>>;
        url: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodString, string, string>>>;
        page: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        post: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        variant: z.ZodDefault<z.ZodEnum<["default", "outline", "soft", "ghost", "link"]>>;
    }, "strip", z.ZodTypeAny, {
        type: "url" | "page" | "post";
        label: string;
        variant: "default" | "outline" | "soft" | "ghost" | "link";
        id?: string | undefined;
        url?: string | null | undefined;
        page?: string | null | undefined;
        post?: string | null | undefined;
    }, {
        label: string;
        type?: "url" | "page" | "post" | undefined;
        id?: string | undefined;
        url?: string | null | undefined;
        page?: string | null | undefined;
        post?: string | null | undefined;
        variant?: "default" | "outline" | "soft" | "ghost" | "link" | undefined;
    }>, {
        type: "url" | "page" | "post";
        label: string;
        variant: "default" | "outline" | "soft" | "ghost" | "link";
        id?: string | undefined;
        url?: string | null | undefined;
        page?: string | null | undefined;
        post?: string | null | undefined;
    }, {
        label: string;
        type?: "url" | "page" | "post" | undefined;
        id?: string | undefined;
        url?: string | null | undefined;
        page?: string | null | undefined;
        post?: string | null | undefined;
        variant?: "default" | "outline" | "soft" | "ghost" | "link" | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    headline: string;
    layout: "image_left" | "image_center" | "image_right";
    buttons: {
        type: "url" | "page" | "post";
        label: string;
        variant: "default" | "outline" | "soft" | "ghost" | "link";
        id?: string | undefined;
        url?: string | null | undefined;
        page?: string | null | undefined;
        post?: string | null | undefined;
    }[];
    tagline?: string | null | undefined;
    description?: string | null | undefined;
    image?: string | null | undefined;
}, {
    headline: string;
    tagline?: string | null | undefined;
    description?: string | null | undefined;
    image?: string | null | undefined;
    layout?: "image_left" | "image_center" | "image_right" | undefined;
    buttons?: {
        label: string;
        type?: "url" | "page" | "post" | undefined;
        id?: string | undefined;
        url?: string | null | undefined;
        page?: string | null | undefined;
        post?: string | null | undefined;
        variant?: "default" | "outline" | "soft" | "ghost" | "link" | undefined;
    }[] | undefined;
}>;
export declare const cmsRichtextItemSchema: z.ZodObject<{
    tagline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    headline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    content: z.ZodString;
    alignment: z.ZodDefault<z.ZodEnum<["left", "center"]>>;
}, "strip", z.ZodTypeAny, {
    content: string;
    alignment: "left" | "center";
    tagline?: string | null | undefined;
    headline?: string | null | undefined;
}, {
    content: string;
    tagline?: string | null | undefined;
    headline?: string | null | undefined;
    alignment?: "left" | "center" | undefined;
}>;
export declare const cmsGalleryItemSchema: z.ZodObject<{
    tagline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    headline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    items: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        file: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        file: string;
        id?: string | undefined;
    }, {
        file: string;
        id?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    items: {
        file: string;
        id?: string | undefined;
    }[];
    tagline?: string | null | undefined;
    headline?: string | null | undefined;
}, {
    tagline?: string | null | undefined;
    headline?: string | null | undefined;
    items?: {
        file: string;
        id?: string | undefined;
    }[] | undefined;
}>;
export declare const cmsPricingItemSchema: z.ZodObject<{
    tagline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    headline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    cards: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        title: z.ZodString;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        price: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        badge: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        features: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        is_highlighted: z.ZodDefault<z.ZodBoolean>;
        button: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            label: z.ZodString;
            type: z.ZodDefault<z.ZodEnum<["url", "page", "post"]>>;
            url: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodString, string, string>>>;
            page: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            post: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            variant: z.ZodDefault<z.ZodEnum<["default", "outline", "soft", "ghost", "link"]>>;
        }, "strip", z.ZodTypeAny, {
            type: "url" | "page" | "post";
            label: string;
            variant: "default" | "outline" | "soft" | "ghost" | "link";
            id?: string | undefined;
            url?: string | null | undefined;
            page?: string | null | undefined;
            post?: string | null | undefined;
        }, {
            label: string;
            type?: "url" | "page" | "post" | undefined;
            id?: string | undefined;
            url?: string | null | undefined;
            page?: string | null | undefined;
            post?: string | null | undefined;
            variant?: "default" | "outline" | "soft" | "ghost" | "link" | undefined;
        }>, {
            type: "url" | "page" | "post";
            label: string;
            variant: "default" | "outline" | "soft" | "ghost" | "link";
            id?: string | undefined;
            url?: string | null | undefined;
            page?: string | null | undefined;
            post?: string | null | undefined;
        }, {
            label: string;
            type?: "url" | "page" | "post" | undefined;
            id?: string | undefined;
            url?: string | null | undefined;
            page?: string | null | undefined;
            post?: string | null | undefined;
            variant?: "default" | "outline" | "soft" | "ghost" | "link" | undefined;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        features: string[];
        is_highlighted: boolean;
        id?: string | undefined;
        description?: string | null | undefined;
        price?: string | null | undefined;
        badge?: string | null | undefined;
        button?: {
            type: "url" | "page" | "post";
            label: string;
            variant: "default" | "outline" | "soft" | "ghost" | "link";
            id?: string | undefined;
            url?: string | null | undefined;
            page?: string | null | undefined;
            post?: string | null | undefined;
        } | null | undefined;
    }, {
        title: string;
        id?: string | undefined;
        description?: string | null | undefined;
        price?: string | null | undefined;
        badge?: string | null | undefined;
        features?: string[] | undefined;
        is_highlighted?: boolean | undefined;
        button?: {
            label: string;
            type?: "url" | "page" | "post" | undefined;
            id?: string | undefined;
            url?: string | null | undefined;
            page?: string | null | undefined;
            post?: string | null | undefined;
            variant?: "default" | "outline" | "soft" | "ghost" | "link" | undefined;
        } | null | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    cards: {
        title: string;
        features: string[];
        is_highlighted: boolean;
        id?: string | undefined;
        description?: string | null | undefined;
        price?: string | null | undefined;
        badge?: string | null | undefined;
        button?: {
            type: "url" | "page" | "post";
            label: string;
            variant: "default" | "outline" | "soft" | "ghost" | "link";
            id?: string | undefined;
            url?: string | null | undefined;
            page?: string | null | undefined;
            post?: string | null | undefined;
        } | null | undefined;
    }[];
    tagline?: string | null | undefined;
    headline?: string | null | undefined;
}, {
    tagline?: string | null | undefined;
    headline?: string | null | undefined;
    cards?: {
        title: string;
        id?: string | undefined;
        description?: string | null | undefined;
        price?: string | null | undefined;
        badge?: string | null | undefined;
        features?: string[] | undefined;
        is_highlighted?: boolean | undefined;
        button?: {
            label: string;
            type?: "url" | "page" | "post" | undefined;
            id?: string | undefined;
            url?: string | null | undefined;
            page?: string | null | undefined;
            post?: string | null | undefined;
            variant?: "default" | "outline" | "soft" | "ghost" | "link" | undefined;
        } | null | undefined;
    }[] | undefined;
}>;
export declare const cmsPostsItemSchema: z.ZodObject<{
    tagline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    headline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    tagline?: string | null | undefined;
    headline?: string | null | undefined;
}, {
    tagline?: string | null | undefined;
    headline?: string | null | undefined;
    limit?: number | undefined;
}>;
export declare const cmsEventsItemSchema: z.ZodObject<{
    headline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    filter_by_category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    filter_featured: z.ZodDefault<z.ZodBoolean>;
    max_items: z.ZodDefault<z.ZodNumber>;
    show_past_events: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    filter_featured: boolean;
    max_items: number;
    show_past_events: boolean;
    headline?: string | null | undefined;
    description?: string | null | undefined;
    filter_by_category?: string | null | undefined;
}, {
    headline?: string | null | undefined;
    description?: string | null | undefined;
    filter_by_category?: string | null | undefined;
    filter_featured?: boolean | undefined;
    max_items?: number | undefined;
    show_past_events?: boolean | undefined;
}>;
export declare const cmsFormBlockItemSchema: z.ZodObject<{
    tagline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    headline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    form: z.ZodString;
}, "strip", z.ZodTypeAny, {
    form: string;
    tagline?: string | null | undefined;
    headline?: string | null | undefined;
}, {
    form: string;
    tagline?: string | null | undefined;
    headline?: string | null | undefined;
}>;
export declare const cmsBlockItemSchemas: {
    readonly block_hero: z.ZodObject<{
        tagline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        headline: z.ZodString;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        image: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        layout: z.ZodDefault<z.ZodEnum<["image_left", "image_center", "image_right"]>>;
        buttons: z.ZodDefault<z.ZodArray<z.ZodEffects<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            label: z.ZodString;
            type: z.ZodDefault<z.ZodEnum<["url", "page", "post"]>>;
            url: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodString, string, string>>>;
            page: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            post: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            variant: z.ZodDefault<z.ZodEnum<["default", "outline", "soft", "ghost", "link"]>>;
        }, "strip", z.ZodTypeAny, {
            type: "url" | "page" | "post";
            label: string;
            variant: "default" | "outline" | "soft" | "ghost" | "link";
            id?: string | undefined;
            url?: string | null | undefined;
            page?: string | null | undefined;
            post?: string | null | undefined;
        }, {
            label: string;
            type?: "url" | "page" | "post" | undefined;
            id?: string | undefined;
            url?: string | null | undefined;
            page?: string | null | undefined;
            post?: string | null | undefined;
            variant?: "default" | "outline" | "soft" | "ghost" | "link" | undefined;
        }>, {
            type: "url" | "page" | "post";
            label: string;
            variant: "default" | "outline" | "soft" | "ghost" | "link";
            id?: string | undefined;
            url?: string | null | undefined;
            page?: string | null | undefined;
            post?: string | null | undefined;
        }, {
            label: string;
            type?: "url" | "page" | "post" | undefined;
            id?: string | undefined;
            url?: string | null | undefined;
            page?: string | null | undefined;
            post?: string | null | undefined;
            variant?: "default" | "outline" | "soft" | "ghost" | "link" | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        headline: string;
        layout: "image_left" | "image_center" | "image_right";
        buttons: {
            type: "url" | "page" | "post";
            label: string;
            variant: "default" | "outline" | "soft" | "ghost" | "link";
            id?: string | undefined;
            url?: string | null | undefined;
            page?: string | null | undefined;
            post?: string | null | undefined;
        }[];
        tagline?: string | null | undefined;
        description?: string | null | undefined;
        image?: string | null | undefined;
    }, {
        headline: string;
        tagline?: string | null | undefined;
        description?: string | null | undefined;
        image?: string | null | undefined;
        layout?: "image_left" | "image_center" | "image_right" | undefined;
        buttons?: {
            label: string;
            type?: "url" | "page" | "post" | undefined;
            id?: string | undefined;
            url?: string | null | undefined;
            page?: string | null | undefined;
            post?: string | null | undefined;
            variant?: "default" | "outline" | "soft" | "ghost" | "link" | undefined;
        }[] | undefined;
    }>;
    readonly block_richtext: z.ZodObject<{
        tagline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        headline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        content: z.ZodString;
        alignment: z.ZodDefault<z.ZodEnum<["left", "center"]>>;
    }, "strip", z.ZodTypeAny, {
        content: string;
        alignment: "left" | "center";
        tagline?: string | null | undefined;
        headline?: string | null | undefined;
    }, {
        content: string;
        tagline?: string | null | undefined;
        headline?: string | null | undefined;
        alignment?: "left" | "center" | undefined;
    }>;
    readonly block_gallery: z.ZodObject<{
        tagline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        headline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        items: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            file: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            file: string;
            id?: string | undefined;
        }, {
            file: string;
            id?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        items: {
            file: string;
            id?: string | undefined;
        }[];
        tagline?: string | null | undefined;
        headline?: string | null | undefined;
    }, {
        tagline?: string | null | undefined;
        headline?: string | null | undefined;
        items?: {
            file: string;
            id?: string | undefined;
        }[] | undefined;
    }>;
    readonly block_pricing: z.ZodObject<{
        tagline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        headline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        cards: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            title: z.ZodString;
            description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            price: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            badge: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            features: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            is_highlighted: z.ZodDefault<z.ZodBoolean>;
            button: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodObject<{
                id: z.ZodOptional<z.ZodString>;
                label: z.ZodString;
                type: z.ZodDefault<z.ZodEnum<["url", "page", "post"]>>;
                url: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodString, string, string>>>;
                page: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                post: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                variant: z.ZodDefault<z.ZodEnum<["default", "outline", "soft", "ghost", "link"]>>;
            }, "strip", z.ZodTypeAny, {
                type: "url" | "page" | "post";
                label: string;
                variant: "default" | "outline" | "soft" | "ghost" | "link";
                id?: string | undefined;
                url?: string | null | undefined;
                page?: string | null | undefined;
                post?: string | null | undefined;
            }, {
                label: string;
                type?: "url" | "page" | "post" | undefined;
                id?: string | undefined;
                url?: string | null | undefined;
                page?: string | null | undefined;
                post?: string | null | undefined;
                variant?: "default" | "outline" | "soft" | "ghost" | "link" | undefined;
            }>, {
                type: "url" | "page" | "post";
                label: string;
                variant: "default" | "outline" | "soft" | "ghost" | "link";
                id?: string | undefined;
                url?: string | null | undefined;
                page?: string | null | undefined;
                post?: string | null | undefined;
            }, {
                label: string;
                type?: "url" | "page" | "post" | undefined;
                id?: string | undefined;
                url?: string | null | undefined;
                page?: string | null | undefined;
                post?: string | null | undefined;
                variant?: "default" | "outline" | "soft" | "ghost" | "link" | undefined;
            }>>>;
        }, "strip", z.ZodTypeAny, {
            title: string;
            features: string[];
            is_highlighted: boolean;
            id?: string | undefined;
            description?: string | null | undefined;
            price?: string | null | undefined;
            badge?: string | null | undefined;
            button?: {
                type: "url" | "page" | "post";
                label: string;
                variant: "default" | "outline" | "soft" | "ghost" | "link";
                id?: string | undefined;
                url?: string | null | undefined;
                page?: string | null | undefined;
                post?: string | null | undefined;
            } | null | undefined;
        }, {
            title: string;
            id?: string | undefined;
            description?: string | null | undefined;
            price?: string | null | undefined;
            badge?: string | null | undefined;
            features?: string[] | undefined;
            is_highlighted?: boolean | undefined;
            button?: {
                label: string;
                type?: "url" | "page" | "post" | undefined;
                id?: string | undefined;
                url?: string | null | undefined;
                page?: string | null | undefined;
                post?: string | null | undefined;
                variant?: "default" | "outline" | "soft" | "ghost" | "link" | undefined;
            } | null | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        cards: {
            title: string;
            features: string[];
            is_highlighted: boolean;
            id?: string | undefined;
            description?: string | null | undefined;
            price?: string | null | undefined;
            badge?: string | null | undefined;
            button?: {
                type: "url" | "page" | "post";
                label: string;
                variant: "default" | "outline" | "soft" | "ghost" | "link";
                id?: string | undefined;
                url?: string | null | undefined;
                page?: string | null | undefined;
                post?: string | null | undefined;
            } | null | undefined;
        }[];
        tagline?: string | null | undefined;
        headline?: string | null | undefined;
    }, {
        tagline?: string | null | undefined;
        headline?: string | null | undefined;
        cards?: {
            title: string;
            id?: string | undefined;
            description?: string | null | undefined;
            price?: string | null | undefined;
            badge?: string | null | undefined;
            features?: string[] | undefined;
            is_highlighted?: boolean | undefined;
            button?: {
                label: string;
                type?: "url" | "page" | "post" | undefined;
                id?: string | undefined;
                url?: string | null | undefined;
                page?: string | null | undefined;
                post?: string | null | undefined;
                variant?: "default" | "outline" | "soft" | "ghost" | "link" | undefined;
            } | null | undefined;
        }[] | undefined;
    }>;
    readonly block_posts: z.ZodObject<{
        tagline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        headline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        limit: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        tagline?: string | null | undefined;
        headline?: string | null | undefined;
    }, {
        tagline?: string | null | undefined;
        headline?: string | null | undefined;
        limit?: number | undefined;
    }>;
    readonly block_events: z.ZodObject<{
        headline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        filter_by_category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        filter_featured: z.ZodDefault<z.ZodBoolean>;
        max_items: z.ZodDefault<z.ZodNumber>;
        show_past_events: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        filter_featured: boolean;
        max_items: number;
        show_past_events: boolean;
        headline?: string | null | undefined;
        description?: string | null | undefined;
        filter_by_category?: string | null | undefined;
    }, {
        headline?: string | null | undefined;
        description?: string | null | undefined;
        filter_by_category?: string | null | undefined;
        filter_featured?: boolean | undefined;
        max_items?: number | undefined;
        show_past_events?: boolean | undefined;
    }>;
    readonly block_form: z.ZodObject<{
        tagline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        headline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        form: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        form: string;
        tagline?: string | null | undefined;
        headline?: string | null | undefined;
    }, {
        form: string;
        tagline?: string | null | undefined;
        headline?: string | null | undefined;
    }>;
};
export declare const cmsPageBlockInputSchema: z.ZodDiscriminatedUnion<"collection", [z.ZodObject<{
    background: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
    hide_block: z.ZodDefault<z.ZodBoolean>;
    collection: z.ZodLiteral<"block_hero">;
    item: z.ZodObject<{
        tagline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        headline: z.ZodString;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        image: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        layout: z.ZodDefault<z.ZodEnum<["image_left", "image_center", "image_right"]>>;
        buttons: z.ZodDefault<z.ZodArray<z.ZodEffects<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            label: z.ZodString;
            type: z.ZodDefault<z.ZodEnum<["url", "page", "post"]>>;
            url: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodString, string, string>>>;
            page: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            post: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            variant: z.ZodDefault<z.ZodEnum<["default", "outline", "soft", "ghost", "link"]>>;
        }, "strip", z.ZodTypeAny, {
            type: "url" | "page" | "post";
            label: string;
            variant: "default" | "outline" | "soft" | "ghost" | "link";
            id?: string | undefined;
            url?: string | null | undefined;
            page?: string | null | undefined;
            post?: string | null | undefined;
        }, {
            label: string;
            type?: "url" | "page" | "post" | undefined;
            id?: string | undefined;
            url?: string | null | undefined;
            page?: string | null | undefined;
            post?: string | null | undefined;
            variant?: "default" | "outline" | "soft" | "ghost" | "link" | undefined;
        }>, {
            type: "url" | "page" | "post";
            label: string;
            variant: "default" | "outline" | "soft" | "ghost" | "link";
            id?: string | undefined;
            url?: string | null | undefined;
            page?: string | null | undefined;
            post?: string | null | undefined;
        }, {
            label: string;
            type?: "url" | "page" | "post" | undefined;
            id?: string | undefined;
            url?: string | null | undefined;
            page?: string | null | undefined;
            post?: string | null | undefined;
            variant?: "default" | "outline" | "soft" | "ghost" | "link" | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        headline: string;
        layout: "image_left" | "image_center" | "image_right";
        buttons: {
            type: "url" | "page" | "post";
            label: string;
            variant: "default" | "outline" | "soft" | "ghost" | "link";
            id?: string | undefined;
            url?: string | null | undefined;
            page?: string | null | undefined;
            post?: string | null | undefined;
        }[];
        tagline?: string | null | undefined;
        description?: string | null | undefined;
        image?: string | null | undefined;
    }, {
        headline: string;
        tagline?: string | null | undefined;
        description?: string | null | undefined;
        image?: string | null | undefined;
        layout?: "image_left" | "image_center" | "image_right" | undefined;
        buttons?: {
            label: string;
            type?: "url" | "page" | "post" | undefined;
            id?: string | undefined;
            url?: string | null | undefined;
            page?: string | null | undefined;
            post?: string | null | undefined;
            variant?: "default" | "outline" | "soft" | "ghost" | "link" | undefined;
        }[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    collection: "block_hero";
    item: {
        headline: string;
        layout: "image_left" | "image_center" | "image_right";
        buttons: {
            type: "url" | "page" | "post";
            label: string;
            variant: "default" | "outline" | "soft" | "ghost" | "link";
            id?: string | undefined;
            url?: string | null | undefined;
            page?: string | null | undefined;
            post?: string | null | undefined;
        }[];
        tagline?: string | null | undefined;
        description?: string | null | undefined;
        image?: string | null | undefined;
    };
    background: "light" | "dark";
    hide_block: boolean;
}, {
    collection: "block_hero";
    item: {
        headline: string;
        tagline?: string | null | undefined;
        description?: string | null | undefined;
        image?: string | null | undefined;
        layout?: "image_left" | "image_center" | "image_right" | undefined;
        buttons?: {
            label: string;
            type?: "url" | "page" | "post" | undefined;
            id?: string | undefined;
            url?: string | null | undefined;
            page?: string | null | undefined;
            post?: string | null | undefined;
            variant?: "default" | "outline" | "soft" | "ghost" | "link" | undefined;
        }[] | undefined;
    };
    background?: "light" | "dark" | undefined;
    hide_block?: boolean | undefined;
}>, z.ZodObject<{
    background: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
    hide_block: z.ZodDefault<z.ZodBoolean>;
    collection: z.ZodLiteral<"block_richtext">;
    item: z.ZodObject<{
        tagline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        headline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        content: z.ZodString;
        alignment: z.ZodDefault<z.ZodEnum<["left", "center"]>>;
    }, "strip", z.ZodTypeAny, {
        content: string;
        alignment: "left" | "center";
        tagline?: string | null | undefined;
        headline?: string | null | undefined;
    }, {
        content: string;
        tagline?: string | null | undefined;
        headline?: string | null | undefined;
        alignment?: "left" | "center" | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    collection: "block_richtext";
    item: {
        content: string;
        alignment: "left" | "center";
        tagline?: string | null | undefined;
        headline?: string | null | undefined;
    };
    background: "light" | "dark";
    hide_block: boolean;
}, {
    collection: "block_richtext";
    item: {
        content: string;
        tagline?: string | null | undefined;
        headline?: string | null | undefined;
        alignment?: "left" | "center" | undefined;
    };
    background?: "light" | "dark" | undefined;
    hide_block?: boolean | undefined;
}>, z.ZodObject<{
    background: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
    hide_block: z.ZodDefault<z.ZodBoolean>;
    collection: z.ZodLiteral<"block_gallery">;
    item: z.ZodObject<{
        tagline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        headline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        items: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            file: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            file: string;
            id?: string | undefined;
        }, {
            file: string;
            id?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        items: {
            file: string;
            id?: string | undefined;
        }[];
        tagline?: string | null | undefined;
        headline?: string | null | undefined;
    }, {
        tagline?: string | null | undefined;
        headline?: string | null | undefined;
        items?: {
            file: string;
            id?: string | undefined;
        }[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    collection: "block_gallery";
    item: {
        items: {
            file: string;
            id?: string | undefined;
        }[];
        tagline?: string | null | undefined;
        headline?: string | null | undefined;
    };
    background: "light" | "dark";
    hide_block: boolean;
}, {
    collection: "block_gallery";
    item: {
        tagline?: string | null | undefined;
        headline?: string | null | undefined;
        items?: {
            file: string;
            id?: string | undefined;
        }[] | undefined;
    };
    background?: "light" | "dark" | undefined;
    hide_block?: boolean | undefined;
}>, z.ZodObject<{
    background: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
    hide_block: z.ZodDefault<z.ZodBoolean>;
    collection: z.ZodLiteral<"block_pricing">;
    item: z.ZodObject<{
        tagline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        headline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        cards: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            title: z.ZodString;
            description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            price: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            badge: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            features: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            is_highlighted: z.ZodDefault<z.ZodBoolean>;
            button: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodObject<{
                id: z.ZodOptional<z.ZodString>;
                label: z.ZodString;
                type: z.ZodDefault<z.ZodEnum<["url", "page", "post"]>>;
                url: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodString, string, string>>>;
                page: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                post: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                variant: z.ZodDefault<z.ZodEnum<["default", "outline", "soft", "ghost", "link"]>>;
            }, "strip", z.ZodTypeAny, {
                type: "url" | "page" | "post";
                label: string;
                variant: "default" | "outline" | "soft" | "ghost" | "link";
                id?: string | undefined;
                url?: string | null | undefined;
                page?: string | null | undefined;
                post?: string | null | undefined;
            }, {
                label: string;
                type?: "url" | "page" | "post" | undefined;
                id?: string | undefined;
                url?: string | null | undefined;
                page?: string | null | undefined;
                post?: string | null | undefined;
                variant?: "default" | "outline" | "soft" | "ghost" | "link" | undefined;
            }>, {
                type: "url" | "page" | "post";
                label: string;
                variant: "default" | "outline" | "soft" | "ghost" | "link";
                id?: string | undefined;
                url?: string | null | undefined;
                page?: string | null | undefined;
                post?: string | null | undefined;
            }, {
                label: string;
                type?: "url" | "page" | "post" | undefined;
                id?: string | undefined;
                url?: string | null | undefined;
                page?: string | null | undefined;
                post?: string | null | undefined;
                variant?: "default" | "outline" | "soft" | "ghost" | "link" | undefined;
            }>>>;
        }, "strip", z.ZodTypeAny, {
            title: string;
            features: string[];
            is_highlighted: boolean;
            id?: string | undefined;
            description?: string | null | undefined;
            price?: string | null | undefined;
            badge?: string | null | undefined;
            button?: {
                type: "url" | "page" | "post";
                label: string;
                variant: "default" | "outline" | "soft" | "ghost" | "link";
                id?: string | undefined;
                url?: string | null | undefined;
                page?: string | null | undefined;
                post?: string | null | undefined;
            } | null | undefined;
        }, {
            title: string;
            id?: string | undefined;
            description?: string | null | undefined;
            price?: string | null | undefined;
            badge?: string | null | undefined;
            features?: string[] | undefined;
            is_highlighted?: boolean | undefined;
            button?: {
                label: string;
                type?: "url" | "page" | "post" | undefined;
                id?: string | undefined;
                url?: string | null | undefined;
                page?: string | null | undefined;
                post?: string | null | undefined;
                variant?: "default" | "outline" | "soft" | "ghost" | "link" | undefined;
            } | null | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        cards: {
            title: string;
            features: string[];
            is_highlighted: boolean;
            id?: string | undefined;
            description?: string | null | undefined;
            price?: string | null | undefined;
            badge?: string | null | undefined;
            button?: {
                type: "url" | "page" | "post";
                label: string;
                variant: "default" | "outline" | "soft" | "ghost" | "link";
                id?: string | undefined;
                url?: string | null | undefined;
                page?: string | null | undefined;
                post?: string | null | undefined;
            } | null | undefined;
        }[];
        tagline?: string | null | undefined;
        headline?: string | null | undefined;
    }, {
        tagline?: string | null | undefined;
        headline?: string | null | undefined;
        cards?: {
            title: string;
            id?: string | undefined;
            description?: string | null | undefined;
            price?: string | null | undefined;
            badge?: string | null | undefined;
            features?: string[] | undefined;
            is_highlighted?: boolean | undefined;
            button?: {
                label: string;
                type?: "url" | "page" | "post" | undefined;
                id?: string | undefined;
                url?: string | null | undefined;
                page?: string | null | undefined;
                post?: string | null | undefined;
                variant?: "default" | "outline" | "soft" | "ghost" | "link" | undefined;
            } | null | undefined;
        }[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    collection: "block_pricing";
    item: {
        cards: {
            title: string;
            features: string[];
            is_highlighted: boolean;
            id?: string | undefined;
            description?: string | null | undefined;
            price?: string | null | undefined;
            badge?: string | null | undefined;
            button?: {
                type: "url" | "page" | "post";
                label: string;
                variant: "default" | "outline" | "soft" | "ghost" | "link";
                id?: string | undefined;
                url?: string | null | undefined;
                page?: string | null | undefined;
                post?: string | null | undefined;
            } | null | undefined;
        }[];
        tagline?: string | null | undefined;
        headline?: string | null | undefined;
    };
    background: "light" | "dark";
    hide_block: boolean;
}, {
    collection: "block_pricing";
    item: {
        tagline?: string | null | undefined;
        headline?: string | null | undefined;
        cards?: {
            title: string;
            id?: string | undefined;
            description?: string | null | undefined;
            price?: string | null | undefined;
            badge?: string | null | undefined;
            features?: string[] | undefined;
            is_highlighted?: boolean | undefined;
            button?: {
                label: string;
                type?: "url" | "page" | "post" | undefined;
                id?: string | undefined;
                url?: string | null | undefined;
                page?: string | null | undefined;
                post?: string | null | undefined;
                variant?: "default" | "outline" | "soft" | "ghost" | "link" | undefined;
            } | null | undefined;
        }[] | undefined;
    };
    background?: "light" | "dark" | undefined;
    hide_block?: boolean | undefined;
}>, z.ZodObject<{
    background: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
    hide_block: z.ZodDefault<z.ZodBoolean>;
    collection: z.ZodLiteral<"block_posts">;
    item: z.ZodObject<{
        tagline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        headline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        limit: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        tagline?: string | null | undefined;
        headline?: string | null | undefined;
    }, {
        tagline?: string | null | undefined;
        headline?: string | null | undefined;
        limit?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    collection: "block_posts";
    item: {
        limit: number;
        tagline?: string | null | undefined;
        headline?: string | null | undefined;
    };
    background: "light" | "dark";
    hide_block: boolean;
}, {
    collection: "block_posts";
    item: {
        tagline?: string | null | undefined;
        headline?: string | null | undefined;
        limit?: number | undefined;
    };
    background?: "light" | "dark" | undefined;
    hide_block?: boolean | undefined;
}>, z.ZodObject<{
    background: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
    hide_block: z.ZodDefault<z.ZodBoolean>;
    collection: z.ZodLiteral<"block_events">;
    item: z.ZodObject<{
        headline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        filter_by_category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        filter_featured: z.ZodDefault<z.ZodBoolean>;
        max_items: z.ZodDefault<z.ZodNumber>;
        show_past_events: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        filter_featured: boolean;
        max_items: number;
        show_past_events: boolean;
        headline?: string | null | undefined;
        description?: string | null | undefined;
        filter_by_category?: string | null | undefined;
    }, {
        headline?: string | null | undefined;
        description?: string | null | undefined;
        filter_by_category?: string | null | undefined;
        filter_featured?: boolean | undefined;
        max_items?: number | undefined;
        show_past_events?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    collection: "block_events";
    item: {
        filter_featured: boolean;
        max_items: number;
        show_past_events: boolean;
        headline?: string | null | undefined;
        description?: string | null | undefined;
        filter_by_category?: string | null | undefined;
    };
    background: "light" | "dark";
    hide_block: boolean;
}, {
    collection: "block_events";
    item: {
        headline?: string | null | undefined;
        description?: string | null | undefined;
        filter_by_category?: string | null | undefined;
        filter_featured?: boolean | undefined;
        max_items?: number | undefined;
        show_past_events?: boolean | undefined;
    };
    background?: "light" | "dark" | undefined;
    hide_block?: boolean | undefined;
}>, z.ZodObject<{
    background: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
    hide_block: z.ZodDefault<z.ZodBoolean>;
    collection: z.ZodLiteral<"block_form">;
    item: z.ZodObject<{
        tagline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        headline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        form: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        form: string;
        tagline?: string | null | undefined;
        headline?: string | null | undefined;
    }, {
        form: string;
        tagline?: string | null | undefined;
        headline?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    collection: "block_form";
    item: {
        form: string;
        tagline?: string | null | undefined;
        headline?: string | null | undefined;
    };
    background: "light" | "dark";
    hide_block: boolean;
}, {
    collection: "block_form";
    item: {
        form: string;
        tagline?: string | null | undefined;
        headline?: string | null | undefined;
    };
    background?: "light" | "dark" | undefined;
    hide_block?: boolean | undefined;
}>]>;
export type CmsPageBlockInput = z.infer<typeof cmsPageBlockInputSchema>;
/** Atualização parcial de um bloco existente: opções e/ou o item por inteiro. */
export declare const cmsPageBlockUpdateSchema: z.ZodObject<{
    background: z.ZodOptional<z.ZodEnum<["light", "dark"]>>;
    hide_block: z.ZodOptional<z.ZodBoolean>;
    item: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    item?: Record<string, unknown> | undefined;
    background?: "light" | "dark" | undefined;
    hide_block?: boolean | undefined;
}, {
    item?: Record<string, unknown> | undefined;
    background?: "light" | "dark" | undefined;
    hide_block?: boolean | undefined;
}>;
export declare const cmsReorderSchema: z.ZodObject<{
    order: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    order: string[];
}, {
    order: string[];
}>;
export declare const cmsNavigationInputSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    is_active: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    title: string;
    id: string;
    is_active: boolean;
}, {
    title: string;
    id: string;
    is_active?: boolean | undefined;
}>;
export declare const cmsNavigationItemInputSchema: z.ZodEffects<z.ZodObject<{
    title: z.ZodString;
    type: z.ZodDefault<z.ZodEnum<["page", "post", "url", "group"]>>;
    page: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    post: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    url: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodString, string, string>>>;
    parent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    type: "url" | "page" | "post" | "group";
    title: string;
    url?: string | null | undefined;
    page?: string | null | undefined;
    post?: string | null | undefined;
    parent?: string | null | undefined;
}, {
    title: string;
    type?: "url" | "page" | "post" | "group" | undefined;
    url?: string | null | undefined;
    page?: string | null | undefined;
    post?: string | null | undefined;
    parent?: string | null | undefined;
}>, {
    type: "url" | "page" | "post" | "group";
    title: string;
    url?: string | null | undefined;
    page?: string | null | undefined;
    post?: string | null | undefined;
    parent?: string | null | undefined;
}, {
    title: string;
    type?: "url" | "page" | "post" | "group" | undefined;
    url?: string | null | undefined;
    page?: string | null | undefined;
    post?: string | null | undefined;
    parent?: string | null | undefined;
}>;
export type CmsNavigationItemInput = z.infer<typeof cmsNavigationItemInputSchema>;
export declare const cmsRedirectInputSchema: z.ZodEffects<z.ZodObject<{
    url_from: z.ZodEffects<z.ZodString, string, string>;
    url_to: z.ZodEffects<z.ZodString, string, string>;
    response_code: z.ZodDefault<z.ZodEnum<["301", "302"]>>;
    note: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    url_from: string;
    url_to: string;
    response_code: "301" | "302";
    note?: string | null | undefined;
}, {
    url_from: string;
    url_to: string;
    response_code?: "301" | "302" | undefined;
    note?: string | null | undefined;
}>, {
    url_from: string;
    url_to: string;
    response_code: "301" | "302";
    note?: string | null | undefined;
}, {
    url_from: string;
    url_to: string;
    response_code?: "301" | "302" | undefined;
    note?: string | null | undefined;
}>;
export type CmsRedirectInput = z.infer<typeof cmsRedirectInputSchema>;
export declare const cmsPostInputSchema: z.ZodObject<{
    title: z.ZodString;
    slug: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    content: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    image: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    author: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    status: z.ZodDefault<z.ZodEnum<["draft", "in_review", "published"]>>;
    published_at: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    seo: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        meta_description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        og_image: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        canonical_url: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodString, string, string>>>;
        no_index: z.ZodDefault<z.ZodBoolean>;
        no_follow: z.ZodDefault<z.ZodBoolean>;
        sitemap: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            change_frequency: z.ZodEnum<["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"]>;
            priority: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            change_frequency: "never" | "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly";
            priority: number;
        }, {
            change_frequency: "never" | "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly";
            priority: number;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        no_index: boolean;
        no_follow: boolean;
        title?: string | null | undefined;
        meta_description?: string | null | undefined;
        og_image?: string | null | undefined;
        canonical_url?: string | null | undefined;
        sitemap?: {
            change_frequency: "never" | "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly";
            priority: number;
        } | null | undefined;
    }, {
        title?: string | null | undefined;
        meta_description?: string | null | undefined;
        og_image?: string | null | undefined;
        canonical_url?: string | null | undefined;
        no_index?: boolean | undefined;
        no_follow?: boolean | undefined;
        sitemap?: {
            change_frequency: "never" | "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly";
            priority: number;
        } | null | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "in_review" | "published";
    title: string;
    published_at: string | null;
    slug: string;
    seo?: {
        no_index: boolean;
        no_follow: boolean;
        title?: string | null | undefined;
        meta_description?: string | null | undefined;
        og_image?: string | null | undefined;
        canonical_url?: string | null | undefined;
        sitemap?: {
            change_frequency: "never" | "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly";
            priority: number;
        } | null | undefined;
    } | null | undefined;
    description?: string | null | undefined;
    image?: string | null | undefined;
    content?: string | null | undefined;
    author?: string | null | undefined;
}, {
    title: string;
    slug: string;
    status?: "draft" | "in_review" | "published" | undefined;
    published_at?: string | null | undefined;
    seo?: {
        title?: string | null | undefined;
        meta_description?: string | null | undefined;
        og_image?: string | null | undefined;
        canonical_url?: string | null | undefined;
        no_index?: boolean | undefined;
        no_follow?: boolean | undefined;
        sitemap?: {
            change_frequency: "never" | "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly";
            priority: number;
        } | null | undefined;
    } | null | undefined;
    description?: string | null | undefined;
    image?: string | null | undefined;
    content?: string | null | undefined;
    author?: string | null | undefined;
}>;
export type CmsPostInput = z.infer<typeof cmsPostInputSchema>;
export declare const CMS_FORM_FIELD_TYPES: readonly ["text", "textarea", "checkbox", "checkbox_group", "radio", "file", "select", "hidden"];
export declare const cmsFormFieldInputSchema: z.ZodEffects<z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    type: z.ZodEnum<["text", "textarea", "checkbox", "checkbox_group", "radio", "file", "select", "hidden"]>;
    label: z.ZodString;
    placeholder: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    help: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    validation: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    width: z.ZodDefault<z.ZodEnum<["100", "67", "50", "33"]>>;
    choices: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
        text: z.ZodString;
        value: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        value: string;
        text: string;
    }, {
        value: string;
        text: string;
    }>, "many">>>;
    required: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    type: "file" | "text" | "textarea" | "checkbox" | "checkbox_group" | "radio" | "select" | "hidden";
    label: string;
    name: string;
    width: "33" | "50" | "100" | "67";
    required: boolean;
    validation?: string | null | undefined;
    id?: string | undefined;
    placeholder?: string | null | undefined;
    help?: string | null | undefined;
    choices?: {
        value: string;
        text: string;
    }[] | null | undefined;
}, {
    type: "file" | "text" | "textarea" | "checkbox" | "checkbox_group" | "radio" | "select" | "hidden";
    label: string;
    name: string;
    validation?: string | null | undefined;
    id?: string | undefined;
    placeholder?: string | null | undefined;
    help?: string | null | undefined;
    width?: "33" | "50" | "100" | "67" | undefined;
    choices?: {
        value: string;
        text: string;
    }[] | null | undefined;
    required?: boolean | undefined;
}>, {
    type: "file" | "text" | "textarea" | "checkbox" | "checkbox_group" | "radio" | "select" | "hidden";
    label: string;
    name: string;
    width: "33" | "50" | "100" | "67";
    required: boolean;
    validation?: string | null | undefined;
    id?: string | undefined;
    placeholder?: string | null | undefined;
    help?: string | null | undefined;
    choices?: {
        value: string;
        text: string;
    }[] | null | undefined;
}, {
    type: "file" | "text" | "textarea" | "checkbox" | "checkbox_group" | "radio" | "select" | "hidden";
    label: string;
    name: string;
    validation?: string | null | undefined;
    id?: string | undefined;
    placeholder?: string | null | undefined;
    help?: string | null | undefined;
    width?: "33" | "50" | "100" | "67" | undefined;
    choices?: {
        value: string;
        text: string;
    }[] | null | undefined;
    required?: boolean | undefined;
}>;
export declare const cmsFormInputSchema: z.ZodEffects<z.ZodObject<{
    title: z.ZodString;
    submit_label: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    success_message: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    on_success: z.ZodDefault<z.ZodEnum<["redirect", "message"]>>;
    success_redirect_url: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodString, string, string>>>;
    is_active: z.ZodDefault<z.ZodBoolean>;
    emails: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
        to: z.ZodArray<z.ZodString, "many">;
        subject: z.ZodString;
        message: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        message: string;
        to: string[];
        subject: string;
    }, {
        to: string[];
        subject: string;
        message?: string | undefined;
    }>, "many">>>;
    fields: z.ZodDefault<z.ZodArray<z.ZodEffects<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        name: z.ZodString;
        type: z.ZodEnum<["text", "textarea", "checkbox", "checkbox_group", "radio", "file", "select", "hidden"]>;
        label: z.ZodString;
        placeholder: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        help: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        validation: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        width: z.ZodDefault<z.ZodEnum<["100", "67", "50", "33"]>>;
        choices: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            value: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            value: string;
            text: string;
        }, {
            value: string;
            text: string;
        }>, "many">>>;
        required: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        type: "file" | "text" | "textarea" | "checkbox" | "checkbox_group" | "radio" | "select" | "hidden";
        label: string;
        name: string;
        width: "33" | "50" | "100" | "67";
        required: boolean;
        validation?: string | null | undefined;
        id?: string | undefined;
        placeholder?: string | null | undefined;
        help?: string | null | undefined;
        choices?: {
            value: string;
            text: string;
        }[] | null | undefined;
    }, {
        type: "file" | "text" | "textarea" | "checkbox" | "checkbox_group" | "radio" | "select" | "hidden";
        label: string;
        name: string;
        validation?: string | null | undefined;
        id?: string | undefined;
        placeholder?: string | null | undefined;
        help?: string | null | undefined;
        width?: "33" | "50" | "100" | "67" | undefined;
        choices?: {
            value: string;
            text: string;
        }[] | null | undefined;
        required?: boolean | undefined;
    }>, {
        type: "file" | "text" | "textarea" | "checkbox" | "checkbox_group" | "radio" | "select" | "hidden";
        label: string;
        name: string;
        width: "33" | "50" | "100" | "67";
        required: boolean;
        validation?: string | null | undefined;
        id?: string | undefined;
        placeholder?: string | null | undefined;
        help?: string | null | undefined;
        choices?: {
            value: string;
            text: string;
        }[] | null | undefined;
    }, {
        type: "file" | "text" | "textarea" | "checkbox" | "checkbox_group" | "radio" | "select" | "hidden";
        label: string;
        name: string;
        validation?: string | null | undefined;
        id?: string | undefined;
        placeholder?: string | null | undefined;
        help?: string | null | undefined;
        width?: "33" | "50" | "100" | "67" | undefined;
        choices?: {
            value: string;
            text: string;
        }[] | null | undefined;
        required?: boolean | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    title: string;
    is_active: boolean;
    on_success: "message" | "redirect";
    fields: {
        type: "file" | "text" | "textarea" | "checkbox" | "checkbox_group" | "radio" | "select" | "hidden";
        label: string;
        name: string;
        width: "33" | "50" | "100" | "67";
        required: boolean;
        validation?: string | null | undefined;
        id?: string | undefined;
        placeholder?: string | null | undefined;
        help?: string | null | undefined;
        choices?: {
            value: string;
            text: string;
        }[] | null | undefined;
    }[];
    submit_label?: string | null | undefined;
    success_message?: string | null | undefined;
    success_redirect_url?: string | null | undefined;
    emails?: {
        message: string;
        to: string[];
        subject: string;
    }[] | null | undefined;
}, {
    title: string;
    is_active?: boolean | undefined;
    submit_label?: string | null | undefined;
    success_message?: string | null | undefined;
    on_success?: "message" | "redirect" | undefined;
    success_redirect_url?: string | null | undefined;
    emails?: {
        to: string[];
        subject: string;
        message?: string | undefined;
    }[] | null | undefined;
    fields?: {
        type: "file" | "text" | "textarea" | "checkbox" | "checkbox_group" | "radio" | "select" | "hidden";
        label: string;
        name: string;
        validation?: string | null | undefined;
        id?: string | undefined;
        placeholder?: string | null | undefined;
        help?: string | null | undefined;
        width?: "33" | "50" | "100" | "67" | undefined;
        choices?: {
            value: string;
            text: string;
        }[] | null | undefined;
        required?: boolean | undefined;
    }[] | undefined;
}>, {
    title: string;
    is_active: boolean;
    on_success: "message" | "redirect";
    fields: {
        type: "file" | "text" | "textarea" | "checkbox" | "checkbox_group" | "radio" | "select" | "hidden";
        label: string;
        name: string;
        width: "33" | "50" | "100" | "67";
        required: boolean;
        validation?: string | null | undefined;
        id?: string | undefined;
        placeholder?: string | null | undefined;
        help?: string | null | undefined;
        choices?: {
            value: string;
            text: string;
        }[] | null | undefined;
    }[];
    submit_label?: string | null | undefined;
    success_message?: string | null | undefined;
    success_redirect_url?: string | null | undefined;
    emails?: {
        message: string;
        to: string[];
        subject: string;
    }[] | null | undefined;
}, {
    title: string;
    is_active?: boolean | undefined;
    submit_label?: string | null | undefined;
    success_message?: string | null | undefined;
    on_success?: "message" | "redirect" | undefined;
    success_redirect_url?: string | null | undefined;
    emails?: {
        to: string[];
        subject: string;
        message?: string | undefined;
    }[] | null | undefined;
    fields?: {
        type: "file" | "text" | "textarea" | "checkbox" | "checkbox_group" | "radio" | "select" | "hidden";
        label: string;
        name: string;
        validation?: string | null | undefined;
        id?: string | undefined;
        placeholder?: string | null | undefined;
        help?: string | null | undefined;
        width?: "33" | "50" | "100" | "67" | undefined;
        choices?: {
            value: string;
            text: string;
        }[] | null | undefined;
        required?: boolean | undefined;
    }[] | undefined;
}>;
export type CmsFormInput = z.infer<typeof cmsFormInputSchema>;
export declare const CMS_SOCIAL_SERVICES: readonly ["facebook", "instagram", "linkedin", "x", "vimeo", "youtube", "github", "discord", "docker"];
export declare const cmsSiteSettingsInputSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    tagline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    url: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodString, string, string>>>;
    accent_color: z.ZodOptional<z.ZodString>;
    social_links: z.ZodOptional<z.ZodArray<z.ZodObject<{
        service: z.ZodEnum<["facebook", "instagram", "linkedin", "x", "vimeo", "youtube", "github", "discord", "docker"]>;
        url: z.ZodEffects<z.ZodString, string, string>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        service: "facebook" | "instagram" | "linkedin" | "x" | "vimeo" | "youtube" | "github" | "discord" | "docker";
    }, {
        url: string;
        service: "facebook" | "instagram" | "linkedin" | "x" | "vimeo" | "youtube" | "github" | "discord" | "docker";
    }>, "many">>;
    favicon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    logo: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    logo_dark_mode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    default_og_image: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    url?: string | null | undefined;
    tagline?: string | null | undefined;
    description?: string | null | undefined;
    accent_color?: string | undefined;
    social_links?: {
        url: string;
        service: "facebook" | "instagram" | "linkedin" | "x" | "vimeo" | "youtube" | "github" | "discord" | "docker";
    }[] | undefined;
    favicon?: string | null | undefined;
    logo?: string | null | undefined;
    logo_dark_mode?: string | null | undefined;
    default_og_image?: string | null | undefined;
}, {
    title: string;
    url?: string | null | undefined;
    tagline?: string | null | undefined;
    description?: string | null | undefined;
    accent_color?: string | undefined;
    social_links?: {
        url: string;
        service: "facebook" | "instagram" | "linkedin" | "x" | "vimeo" | "youtube" | "github" | "discord" | "docker";
    }[] | undefined;
    favicon?: string | null | undefined;
    logo?: string | null | undefined;
    logo_dark_mode?: string | null | undefined;
    default_og_image?: string | null | undefined;
}>;
export type CmsSiteSettingsInput = z.infer<typeof cmsSiteSettingsInputSchema>;
export declare const cmsListQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    search: z.ZodDefault<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["draft", "in_review", "published"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    search: string;
    status?: "draft" | "in_review" | "published" | undefined;
}, {
    status?: "draft" | "in_review" | "published" | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    search?: string | undefined;
}>;
export type CmsListQuery = z.infer<typeof cmsListQuerySchema>;
//# sourceMappingURL=cms.d.ts.map