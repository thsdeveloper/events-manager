import { sanitizePostgrestOrTerm } from './search.js';
/**
 * Colunas de mídia expandidas: o painel pré-visualiza a imagem direto do
 * storage e o site público monta a URL a partir de `{bucket, path}`.
 */
const mediaColumns = 'id,bucket,path,filename,title,type,width,height';
const pageColumns = 'id,title,permalink,status,published_at,seo,sort,date_created,date_updated';
const postColumns = 'id,title,name,slug,description,content,status,published_at,seo,author,date_created,date_updated,' +
    `image:media_files(${mediaColumns}),author_profile:profiles(id,first_name,last_name,email)`;
const siteSettingsColumns = 'id,title,description,tagline,url,social_links,accent_color,date_created,date_updated,' +
    `favicon:media_files!site_settings_favicon_fkey(${mediaColumns}),` +
    `logo:media_files!site_settings_logo_fkey(${mediaColumns}),` +
    `logo_dark_mode:media_files!site_settings_logo_dark_mode_fkey(${mediaColumns}),` +
    `default_og_image:media_files!site_settings_default_og_image_fkey(${mediaColumns})`;
const navigationItemColumns = 'id,navigation,parent,title,type,url,sort,page:pages(id,title,permalink),post:posts(id,title,slug)';
const blockTables = {
    block_hero: 'block_hero',
    block_richtext: 'block_richtext',
    block_gallery: 'block_gallery',
    block_pricing: 'block_pricing',
    block_posts: 'block_posts',
    block_events: 'block_events',
    block_form: 'block_form',
};
function unwrap(result) {
    if (result.error)
        throw result.error;
    return result.data;
}
function first(value) {
    if (Array.isArray(value))
        return value[0] ?? null;
    return value ?? null;
}
function pick(row, keys) {
    const picked = {};
    for (const key of keys)
        if (key in row)
            picked[key] = row[key];
    return picked;
}
function buttonRow(button, group, sort) {
    return {
        button_group: group,
        label: button.label ?? null,
        type: button.type ?? 'url',
        url: button.type === 'url' ? (button.url ?? null) : null,
        page: button.type === 'page' ? (button.page ?? null) : null,
        post: button.type === 'post' ? (button.post ?? null) : null,
        variant: button.variant ?? 'default',
        sort,
    };
}
export class SupabaseCmsRepository {
    clients;
    db;
    constructor(clients) {
        this.clients = clients;
        this.db = clients.admin;
    }
    // -------------------------------------------------------------------------
    // Páginas
    // -------------------------------------------------------------------------
    async listPages(query) {
        let builder = this.db.from('pages').select(pageColumns, { count: 'exact' });
        const search = sanitizePostgrestOrTerm(query.search);
        if (search)
            builder = builder.or(`title.ilike.%${search}%,permalink.ilike.%${search}%`);
        if (query.status)
            builder = builder.eq('status', query.status);
        const from = (query.page - 1) * query.limit;
        const { data, count, error } = await builder.order('date_updated', { ascending: false }).range(from, from + query.limit - 1);
        if (error)
            throw error;
        return { data: (data ?? []), total: count ?? 0 };
    }
    async getPage(id) {
        const page = unwrap(await this.db.from('pages').select(pageColumns).eq('id', id).maybeSingle());
        if (!page)
            return null;
        const blocks = unwrap(await this.db.from('page_blocks').select('*').eq('page', id).order('sort', { ascending: true }));
        const expanded = await Promise.all((blocks ?? []).map(async (block) => ({
            ...block,
            item: await this.readBlockItem(block.collection, String(block.item)),
        })));
        return { ...page, blocks: expanded };
    }
    async findPageByPermalink(permalink) {
        return unwrap(await this.db.from('pages').select('id').eq('permalink', permalink).maybeSingle());
    }
    async createPage(input) {
        return unwrap(await this.db.from('pages').insert(input).select(pageColumns).single());
    }
    async updatePage(id, input) {
        const before = unwrap(await this.db.from('pages').select(pageColumns).eq('id', id).maybeSingle());
        if (!before)
            return null;
        const data = unwrap(await this.db.from('pages').update(input).eq('id', id).select(pageColumns).single());
        return { before, data };
    }
    async deletePage(id) {
        const page = await this.getPage(id);
        if (!page)
            return null;
        // Grupos de botões e botões de cards não caem em cascata com o item.
        for (const block of page.blocks)
            await this.cleanupBlockRelations(block);
        unwrap(await this.db.from('pages').delete().eq('id', id));
        return page;
    }
    // -------------------------------------------------------------------------
    // Blocos
    // -------------------------------------------------------------------------
    async listBlockIds(pageId) {
        const rows = unwrap(await this.db.from('page_blocks').select('id').eq('page', pageId).order('sort', { ascending: true }));
        return (rows ?? []).map((row) => row.id);
    }
    async createBlock(pageId, block) {
        const collection = block.collection;
        const itemId = await this.writeBlockItem(collection, block.item, null);
        const created = unwrap(await this.db
            .from('page_blocks')
            .insert({
            page: pageId,
            collection,
            item: itemId,
            sort: block.sort,
            background: block.background,
            hide_block: block.hide_block,
        })
            .select('*')
            .single());
        return { ...created, item: await this.readBlockItem(collection, itemId) };
    }
    async getBlock(pageId, blockId) {
        const block = unwrap(await this.db.from('page_blocks').select('*').eq('id', blockId).eq('page', pageId).maybeSingle());
        if (!block)
            return null;
        return { ...block, item: await this.readBlockItem(block.collection, String(block.item)) };
    }
    async updateBlock(pageId, blockId, patch) {
        const block = unwrap(await this.db.from('page_blocks').select('*').eq('id', blockId).eq('page', pageId).maybeSingle());
        if (!block)
            return null;
        const collection = block.collection;
        if (patch.item)
            await this.writeBlockItem(collection, patch.item, String(block.item));
        const options = {};
        if (patch.background !== undefined)
            options.background = patch.background;
        if (patch.hide_block !== undefined)
            options.hide_block = patch.hide_block;
        const updated = Object.keys(options).length
            ? unwrap(await this.db.from('page_blocks').update(options).eq('id', blockId).select('*').single())
            : block;
        return { ...updated, item: await this.readBlockItem(collection, String(block.item)) };
    }
    async deleteBlock(pageId, blockId) {
        const block = await this.getBlock(pageId, blockId);
        if (!block)
            return null;
        await this.cleanupBlockRelations(block);
        // O gatilho page_blocks_delete_item remove a linha do item no banco.
        unwrap(await this.db.from('page_blocks').delete().eq('id', blockId));
        return block;
    }
    async setBlockOrder(pageId, order) {
        await Promise.all(order.map((id, index) => this.db
            .from('page_blocks')
            .update({ sort: index + 1 })
            .eq('id', id)
            .eq('page', pageId)
            .then((result) => unwrap(result))));
    }
    /** Item de bloco no formato que o painel edita (relações achatadas). */
    async readBlockItem(collection, itemId) {
        const table = blockTables[collection];
        if (!table)
            return null;
        const select = collection === 'block_hero'
            ? `*,image:media_files(${mediaColumns})`
            : collection === 'block_form'
                ? '*,form_definition:forms(id,title,is_active)'
                : collection === 'block_events'
                    ? '*,category:event_categories(id,name,slug)'
                    : '*';
        const item = unwrap(await this.db.from(table).select(select).eq('id', itemId).maybeSingle());
        if (!item)
            return null;
        if (collection === 'block_hero') {
            const buttons = item.button_group
                ? (unwrap(await this.db
                    .from('block_buttons')
                    .select('id,label,type,url,page,post,variant,sort')
                    .eq('button_group', item.button_group)
                    .order('sort')) ?? [])
                : [];
            return { ...item, image: first(item.image), buttons };
        }
        if (collection === 'block_gallery') {
            const items = unwrap(await this.db
                .from('block_gallery_items')
                .select(`id,sort,file:media_files(${mediaColumns})`)
                .eq('block_gallery', itemId)
                .order('sort'));
            return { ...item, items: (items ?? []).map((entry) => ({ ...entry, file: first(entry.file) })) };
        }
        if (collection === 'block_pricing') {
            const cards = unwrap(await this.db
                .from('block_pricing_cards')
                .select('id,title,description,price,badge,features,is_highlighted,sort,button:block_buttons(id,label,type,url,page,post,variant)')
                .eq('pricing', itemId)
                .order('sort'));
            return { ...item, cards: (cards ?? []).map((card) => ({ ...card, button: first(card.button) })) };
        }
        if (collection === 'block_form')
            return { ...item, form_definition: first(item.form_definition) };
        if (collection === 'block_events')
            return { ...item, category: first(item.category) };
        return item;
    }
    /** Grava (ou regrava) o item e suas relações; devolve o id do item. */
    async writeBlockItem(collection, item, existingId) {
        const table = blockTables[collection];
        const upsert = async (values) => {
            if (existingId) {
                unwrap(await this.db.from(table).update(values).eq('id', existingId));
                return existingId;
            }
            const created = unwrap(await this.db.from(table).insert(values).select('id').single());
            return created.id;
        };
        if (collection === 'block_hero') {
            const values = pick(item, ['tagline', 'headline', 'description', 'image', 'layout']);
            const buttons = Array.isArray(item.buttons) ? item.buttons : null;
            let group = null;
            if (existingId) {
                const current = unwrap(await this.db.from(table).select('button_group').eq('id', existingId).maybeSingle());
                group = current?.button_group ?? null;
            }
            if (buttons) {
                if (!group) {
                    group = unwrap(await this.db.from('block_button_groups').insert({ sort: 1 }).select('id').single()).id;
                }
                else {
                    unwrap(await this.db.from('block_buttons').delete().eq('button_group', group));
                }
                if (buttons.length) {
                    unwrap(await this.db.from('block_buttons').insert(buttons.map((button, index) => buttonRow(button, group, index + 1))));
                }
            }
            return upsert({ ...values, ...(group ? { button_group: group } : {}) });
        }
        if (collection === 'block_gallery') {
            const id = await upsert(pick(item, ['tagline', 'headline']));
            if (Array.isArray(item.items)) {
                unwrap(await this.db.from('block_gallery_items').delete().eq('block_gallery', id));
                const entries = item.items.map((entry, index) => ({ block_gallery: id, file: entry.file, sort: index + 1 }));
                if (entries.length)
                    unwrap(await this.db.from('block_gallery_items').insert(entries));
            }
            return id;
        }
        if (collection === 'block_pricing') {
            const id = await upsert(pick(item, ['tagline', 'headline']));
            if (Array.isArray(item.cards)) {
                const previous = unwrap(await this.db.from('block_pricing_cards').select('button').eq('pricing', id));
                const buttonIds = (previous ?? []).map((card) => card.button).filter((value) => Boolean(value));
                unwrap(await this.db.from('block_pricing_cards').delete().eq('pricing', id));
                if (buttonIds.length)
                    unwrap(await this.db.from('block_buttons').delete().in('id', buttonIds));
                let sort = 0;
                for (const card of item.cards) {
                    sort += 1;
                    let button = null;
                    if (card.button && typeof card.button === 'object') {
                        button = unwrap(await this.db.from('block_buttons').insert(buttonRow(card.button, null, 1)).select('id').single()).id;
                    }
                    unwrap(await this.db.from('block_pricing_cards').insert({
                        pricing: id,
                        title: card.title ?? null,
                        description: card.description ?? null,
                        price: card.price ?? null,
                        badge: card.badge ?? null,
                        features: card.features ?? [],
                        is_highlighted: card.is_highlighted ?? false,
                        button,
                        sort,
                    }));
                }
            }
            return id;
        }
        if (collection === 'block_richtext')
            return upsert(pick(item, ['tagline', 'headline', 'content', 'alignment']));
        if (collection === 'block_posts')
            return upsert({ ...pick(item, ['tagline', 'headline', 'limit']), collection: 'posts' });
        if (collection === 'block_events') {
            return upsert(pick(item, ['headline', 'description', 'filter_by_category', 'filter_featured', 'max_items', 'show_past_events']));
        }
        return upsert(pick(item, ['tagline', 'headline', 'form']));
    }
    async cleanupBlockRelations(block) {
        const item = block.item;
        if (!item)
            return;
        if (block.collection === 'block_hero' && item.button_group) {
            unwrap(await this.db.from('block_button_groups').delete().eq('id', item.button_group));
        }
        if (block.collection === 'block_pricing' && Array.isArray(item.cards)) {
            const buttonIds = item.cards
                .map((card) => card.button?.id)
                .filter((value) => typeof value === 'string');
            if (buttonIds.length)
                unwrap(await this.db.from('block_buttons').delete().in('id', buttonIds));
        }
    }
    // -------------------------------------------------------------------------
    // Menus
    // -------------------------------------------------------------------------
    async listNavigations() {
        const rows = unwrap(await this.db.from('navigation').select('*').order('title'));
        return rows ?? [];
    }
    async getNavigation(id) {
        const navigation = unwrap(await this.db.from('navigation').select('*').eq('id', id).maybeSingle());
        if (!navigation)
            return null;
        const items = unwrap(await this.db.from('navigation_items').select(navigationItemColumns).eq('navigation', id).order('sort', { ascending: true }));
        const byParent = new Map();
        for (const item of items ?? []) {
            const key = item.parent ?? null;
            byParent.set(key, [...(byParent.get(key) ?? []), { ...item, page: first(item.page), post: first(item.post) }]);
        }
        const attach = (item) => ({ ...item, children: (byParent.get(String(item.id)) ?? []).map(attach) });
        return { ...navigation, items: (byParent.get(null) ?? []).map(attach) };
    }
    async createNavigation(input) {
        return unwrap(await this.db.from('navigation').insert(input).select('*').single());
    }
    async updateNavigation(id, input) {
        const before = unwrap(await this.db.from('navigation').select('*').eq('id', id).maybeSingle());
        if (!before)
            return null;
        const data = unwrap(await this.db.from('navigation').update(input).eq('id', id).select('*').single());
        return { before, data };
    }
    async deleteNavigation(id) {
        const before = unwrap(await this.db.from('navigation').select('*').eq('id', id).maybeSingle());
        if (!before)
            return null;
        unwrap(await this.db.from('navigation').delete().eq('id', id));
        return before;
    }
    async getNavigationItem(navigationId, itemId) {
        return unwrap(await this.db.from('navigation_items').select('id,navigation,parent,title,type').eq('navigation', navigationId).eq('id', itemId).maybeSingle());
    }
    navigationItemValues(input) {
        return {
            title: input.title,
            type: input.type ?? 'url',
            url: input.type === 'url' ? (input.url ?? null) : null,
            page: input.type === 'page' ? (input.page ?? null) : null,
            post: input.type === 'post' ? (input.post ?? null) : null,
            parent: input.parent ?? null,
        };
    }
    async createNavigationItem(navigationId, input) {
        let siblings = this.db.from('navigation_items').select('id', { count: 'exact', head: true }).eq('navigation', navigationId);
        siblings = input.parent ? siblings.eq('parent', input.parent) : siblings.is('parent', null);
        const { count, error } = await siblings;
        if (error)
            throw error;
        return unwrap(await this.db
            .from('navigation_items')
            .insert({ ...this.navigationItemValues(input), navigation: navigationId, sort: (count ?? 0) + 1 })
            .select(navigationItemColumns)
            .single());
    }
    async updateNavigationItem(navigationId, itemId, input) {
        const before = unwrap(await this.db.from('navigation_items').select(navigationItemColumns).eq('navigation', navigationId).eq('id', itemId).maybeSingle());
        if (!before)
            return null;
        const data = unwrap(await this.db
            .from('navigation_items')
            .update(this.navigationItemValues(input))
            .eq('id', itemId)
            .eq('navigation', navigationId)
            .select(navigationItemColumns)
            .single());
        return { before, data };
    }
    async deleteNavigationItem(navigationId, itemId) {
        const before = unwrap(await this.db.from('navigation_items').select(navigationItemColumns).eq('navigation', navigationId).eq('id', itemId).maybeSingle());
        if (!before)
            return null;
        unwrap(await this.db.from('navigation_items').delete().eq('id', itemId).eq('navigation', navigationId));
        return before;
    }
    async setNavigationItemOrder(navigationId, parent, order) {
        await Promise.all(order.map((id, index) => this.db
            .from('navigation_items')
            .update({ sort: index + 1, parent })
            .eq('id', id)
            .eq('navigation', navigationId)
            .then((result) => unwrap(result))));
    }
    // -------------------------------------------------------------------------
    // Posts
    // -------------------------------------------------------------------------
    async listPosts(query) {
        let builder = this.db
            .from('posts')
            .select(`id,title,slug,description,status,published_at,date_updated,image:media_files(${mediaColumns})`, { count: 'exact' });
        const search = sanitizePostgrestOrTerm(query.search);
        if (search)
            builder = builder.or(`title.ilike.%${search}%,slug.ilike.%${search}%`);
        if (query.status)
            builder = builder.eq('status', query.status);
        const from = (query.page - 1) * query.limit;
        const { data, count, error } = await builder.order('date_updated', { ascending: false }).range(from, from + query.limit - 1);
        if (error)
            throw error;
        return {
            data: (data ?? []).map((post) => ({ ...post, image: first(post.image) })),
            total: count ?? 0,
        };
    }
    normalizePost(post) {
        if (!post)
            return null;
        return { ...post, image: first(post.image), author_profile: first(post.author_profile) };
    }
    async getPost(id) {
        return this.normalizePost(unwrap(await this.db.from('posts').select(postColumns).eq('id', id).maybeSingle()));
    }
    async findPostBySlug(slug) {
        return unwrap(await this.db.from('posts').select('id').eq('slug', slug).maybeSingle());
    }
    async createPost(input) {
        return this.normalizePost(unwrap(await this.db.from('posts').insert(input).select(postColumns).single()));
    }
    async updatePost(id, input) {
        const before = await this.getPost(id);
        if (!before)
            return null;
        const data = this.normalizePost(unwrap(await this.db.from('posts').update(input).eq('id', id).select(postColumns).single()));
        return { before, data };
    }
    async deletePost(id) {
        const before = await this.getPost(id);
        if (!before)
            return null;
        unwrap(await this.db.from('posts').delete().eq('id', id));
        return before;
    }
    // -------------------------------------------------------------------------
    // Redirecionamentos
    // -------------------------------------------------------------------------
    async listRedirects() {
        return (unwrap(await this.db.from('redirects').select('*').order('date_updated', { ascending: false })) ?? []);
    }
    async findRedirectByFrom(urlFrom) {
        return unwrap(await this.db.from('redirects').select('id,url_from,url_to').eq('url_from', urlFrom).maybeSingle());
    }
    async createRedirect(input) {
        return unwrap(await this.db.from('redirects').insert(input).select('*').single());
    }
    async updateRedirect(id, input) {
        const before = unwrap(await this.db.from('redirects').select('*').eq('id', id).maybeSingle());
        if (!before)
            return null;
        const data = unwrap(await this.db.from('redirects').update(input).eq('id', id).select('*').single());
        return { before, data };
    }
    async deleteRedirect(id) {
        const before = unwrap(await this.db.from('redirects').select('*').eq('id', id).maybeSingle());
        if (!before)
            return null;
        unwrap(await this.db.from('redirects').delete().eq('id', id));
        return before;
    }
    // -------------------------------------------------------------------------
    // Formulários
    // -------------------------------------------------------------------------
    async listForms() {
        return (unwrap(await this.db.from('forms').select('*').order('title')) ?? []);
    }
    async getForm(id) {
        const form = unwrap(await this.db.from('forms').select('*').eq('id', id).maybeSingle());
        if (!form)
            return null;
        const fields = unwrap(await this.db.from('form_fields').select('*').eq('form', id).order('sort', { ascending: true }));
        return { ...form, fields: fields ?? [] };
    }
    async createForm(input, fields) {
        const form = unwrap(await this.db.from('forms').insert(input).select('*').single());
        if (fields.length) {
            unwrap(await this.db.from('form_fields').insert(fields.map(({ id: _id, ...field }) => ({ ...field, form: form.id }))));
        }
        return (await this.getForm(String(form.id))) ?? form;
    }
    /**
     * Campos existentes são atualizados pelo id para que as respostas antigas
     * continuem ligadas a eles; os removidos do formulário são apagados.
     */
    async updateForm(id, input, fields) {
        const before = await this.getForm(id);
        if (!before)
            return null;
        unwrap(await this.db.from('forms').update(input).eq('id', id));
        const keptIds = fields.map((field) => field.id).filter((value) => typeof value === 'string');
        const removed = before.fields.map((field) => String(field.id)).filter((fieldId) => !keptIds.includes(fieldId));
        if (removed.length)
            unwrap(await this.db.from('form_fields').delete().in('id', removed));
        for (const { id: fieldId, ...field } of fields) {
            if (fieldId && keptIds.includes(String(fieldId))) {
                unwrap(await this.db.from('form_fields').update({ ...field, form: id }).eq('id', fieldId).eq('form', id));
            }
            else {
                unwrap(await this.db.from('form_fields').insert({ ...field, form: id }));
            }
        }
        const data = (await this.getForm(id));
        return { before, data };
    }
    async deleteForm(id) {
        const before = await this.getForm(id);
        if (!before)
            return null;
        unwrap(await this.db.from('forms').delete().eq('id', id));
        return before;
    }
    async listFormSubmissions(formId, query) {
        const from = (query.page - 1) * query.limit;
        const { data, count, error } = await this.db
            .from('form_submissions')
            .select('id,timestamp,submitted_by,values:form_submission_values(id,value,sort,file,field:form_fields(id,name,label,type))', {
            count: 'exact',
        })
            .eq('form', formId)
            .order('timestamp', { ascending: false })
            .range(from, from + query.limit - 1);
        if (error)
            throw error;
        return { data: (data ?? []), total: count ?? 0 };
    }
    // -------------------------------------------------------------------------
    // Mídia
    // -------------------------------------------------------------------------
    async listMedia(query) {
        let builder = this.db
            .from('media_files')
            .select('id,bucket,path,filename,title,description,type,filesize,width,height,uploaded_by,date_created', { count: 'exact' });
        const search = sanitizePostgrestOrTerm(query.search);
        if (search)
            builder = builder.or(`filename.ilike.%${search}%,title.ilike.%${search}%`);
        const from = (query.page - 1) * query.limit;
        const { data, count, error } = await builder.order('date_created', { ascending: false }).range(from, from + query.limit - 1);
        if (error)
            throw error;
        return { data: (data ?? []), total: count ?? 0 };
    }
    async updateMedia(id, input) {
        const before = unwrap(await this.db.from('media_files').select('*').eq('id', id).maybeSingle());
        if (!before)
            return null;
        const data = unwrap(await this.db.from('media_files').update(input).eq('id', id).select('*').single());
        return { before, data };
    }
    async deleteMedia(id) {
        const before = unwrap(await this.db.from('media_files').select('*').eq('id', id).maybeSingle());
        if (!before)
            return null;
        // O registro sai antes do objeto: as FKs viram nulas na hora e, se o
        // storage falhar, sobra um objeto sem referência e não o contrário.
        unwrap(await this.db.from('media_files').delete().eq('id', id));
        const { error } = await this.clients.admin.storage.from(String(before.bucket ?? 'media')).remove([String(before.path)]);
        if (error)
            throw error;
        return before;
    }
    // -------------------------------------------------------------------------
    // Configurações do site
    // -------------------------------------------------------------------------
    normalizeSettings(settings) {
        if (!settings)
            return null;
        return {
            ...settings,
            favicon: first(settings.favicon),
            logo: first(settings.logo),
            logo_dark_mode: first(settings.logo_dark_mode),
            default_og_image: first(settings.default_og_image),
        };
    }
    async getSiteSettings() {
        return this.normalizeSettings(unwrap(await this.db.from('site_settings').select(siteSettingsColumns).order('date_created').limit(1).maybeSingle()));
    }
    async updateSiteSettings(input) {
        const before = await this.getSiteSettings();
        const data = before
            ? unwrap(await this.db.from('site_settings').update(input).eq('id', before.id).select(siteSettingsColumns).single())
            : unwrap(await this.db.from('site_settings').insert(input).select(siteSettingsColumns).single());
        return { before: before ?? {}, data: this.normalizeSettings(data) };
    }
    // -------------------------------------------------------------------------
    // Visão geral e auditoria
    // -------------------------------------------------------------------------
    async countContent() {
        const count = async (table) => {
            const { count: total, error } = await this.db.from(table).select('id', { count: 'exact', head: true });
            if (error)
                throw error;
            return total ?? 0;
        };
        const byStatus = async (table) => {
            const rows = unwrap(await this.db.from(table).select('status'));
            const result = { draft: 0, in_review: 0, published: 0 };
            for (const row of rows ?? [])
                result[row.status] = (result[row.status] ?? 0) + 1;
            return result;
        };
        const [pages, posts, forms, submissions, media, redirects, navigations] = await Promise.all([
            byStatus('pages'),
            byStatus('posts'),
            count('forms'),
            count('form_submissions'),
            count('media_files'),
            count('redirects'),
            count('navigation'),
        ]);
        return { pages, posts, forms, submissions, media, redirects, navigations };
    }
    async listActivity(resourceType, resourceId, limit) {
        const rows = unwrap(await this.db
            .from('audit_logs')
            .select('id,action,resource_type,resource_id,before_data,after_data,metadata,date_created,actor:profiles(id,first_name,last_name,email)')
            .eq('resource_type', resourceType)
            .eq('resource_id', resourceId)
            .order('date_created', { ascending: false })
            .limit(limit));
        return (rows ?? []).map((row) => ({ ...row, actor: first(row.actor) }));
    }
    async recordAudit(input) {
        unwrap(await this.db.from('audit_logs').insert({
            actor_id: input.actorId,
            action: input.action,
            resource_type: input.resourceType,
            resource_id: input.resourceId,
            before_data: input.before ?? null,
            after_data: input.after ?? null,
            metadata: { ip: input.context.ip, user_agent: input.context.userAgent },
        }));
    }
}
//# sourceMappingURL=cms-repository.js.map