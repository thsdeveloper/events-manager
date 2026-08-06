import { ApiError } from '../../shared/errors.js';
const blockTables = {
    block_hero: 'block_hero',
    block_richtext: 'block_richtext',
    block_gallery: 'block_gallery',
    block_pricing: 'block_pricing',
    block_posts: 'block_posts',
    block_events: 'block_events',
    block_form: 'block_form',
};
export class SupabaseContentRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async getSite() {
        const [settingsResult, mainResult, footerResult] = await Promise.all([
            this.database
                .from('site_settings')
                .select('id,title,description,tagline,url,favicon,logo,logo_dark_mode,social_links,accent_color,date_created,date_updated')
                .limit(1)
                .maybeSingle(),
            this.getNavigation('main'),
            this.getNavigation('footer'),
        ]);
        if (settingsResult.error)
            throw settingsResult.error;
        return {
            globals: settingsResult.data ?? {
                id: 'local-defaults',
                title: 'Events Manager',
                description: 'Plataforma de gestão de eventos.',
                accent_color: '#6644ff',
            },
            headerNavigation: mainResult,
            footerNavigation: footerResult,
        };
    }
    async getPage(permalink, postPage = 1) {
        const { data: page, error } = await this.database
            .from('pages')
            .select('*')
            .eq('permalink', permalink)
            .eq('status', 'published')
            .maybeSingle();
        if (error)
            throw error;
        if (!page)
            throw new ApiError('Página não encontrada.', 404, 'PAGE_NOT_FOUND');
        const { data: pageBlocks, error: blocksError } = await this.database
            .from('page_blocks')
            .select('*')
            .eq('page', page.id)
            .eq('hide_block', false)
            .order('sort', { ascending: true });
        if (blocksError)
            throw blocksError;
        const blocks = await Promise.all((pageBlocks ?? []).map(async (block) => ({
            ...block,
            item: await this.getBlockItem(block.collection, block.item, postPage),
        })));
        return { ...page, blocks };
    }
    async getPost(slug) {
        const [postResult, relatedResult] = await Promise.all([
            this.database
                .from('posts')
                .select('*, author:profiles(id,first_name,last_name,avatar), image:media_files(*)')
                .eq('slug', slug)
                .eq('status', 'published')
                .maybeSingle(),
            this.database
                .from('posts')
                .select('id,title,slug,image:media_files(*)')
                .eq('status', 'published')
                .neq('slug', slug)
                .order('published_at', { ascending: false })
                .limit(2),
        ]);
        if (postResult.error)
            throw postResult.error;
        if (relatedResult.error)
            throw relatedResult.error;
        return { post: postResult.data, relatedPosts: relatedResult.data ?? [] };
    }
    async listPosts(limit, page) {
        const from = (page - 1) * limit;
        const { data, count, error } = await this.database
            .from('posts')
            .select('id,title,description,slug,image:media_files(*),name,published_at', { count: 'exact' })
            .eq('status', 'published')
            .order('published_at', { ascending: false })
            .range(from, from + limit - 1);
        if (error)
            throw error;
        return { data: data ?? [], total: count ?? 0, page, limit };
    }
    async getRedirects() {
        const { data, error } = await this.database
            .from('redirects')
            .select('url_from,url_to,response_code')
            .not('url_from', 'is', null)
            .not('url_to', 'is', null);
        if (error)
            throw error;
        return data ?? [];
    }
    async search(query) {
        const pattern = `%${query}%`;
        const [pages, posts, events] = await Promise.all([
            this.database
                .from('pages')
                .select('id,title,permalink')
                .eq('status', 'published')
                .ilike('title', pattern)
                .limit(10),
            this.database
                .from('posts')
                .select('id,title,slug,description')
                .eq('status', 'published')
                .ilike('title', pattern)
                .limit(10),
            this.database
                .from('events')
                .select('id,title,slug,short_description')
                .eq('status', 'published')
                .ilike('title', pattern)
                .limit(10),
        ]);
        for (const result of [pages, posts, events])
            if (result.error)
                throw result.error;
        return { pages: pages.data ?? [], posts: posts.data ?? [], events: events.data ?? [] };
    }
    async getNavigation(id) {
        const { data: navigation, error } = await this.database.from('navigation').select('*').eq('id', id).maybeSingle();
        if (error)
            throw error;
        if (!navigation)
            return { id, title: id, items: [] };
        const { data: items, error: itemsError } = await this.database
            .from('navigation_items')
            .select('*, page:pages(id,permalink), post:posts(id,slug)')
            .eq('navigation', id)
            .order('sort', { ascending: true });
        if (itemsError)
            throw itemsError;
        const byParent = new Map();
        for (const item of items ?? []) {
            const key = item.parent ?? null;
            byParent.set(key, [...(byParent.get(key) ?? []), item]);
        }
        const attachChildren = (item) => ({
            ...item,
            children: (byParent.get(item.id) ?? []).map(attachChildren),
        });
        return { ...navigation, items: (byParent.get(null) ?? []).map(attachChildren) };
    }
    async getBlockItem(collection, id, postPage) {
        const table = blockTables[collection];
        if (!table)
            return null;
        const { data, error } = await this.database.from(table).select('*').eq('id', id).maybeSingle();
        if (error)
            throw error;
        if (!data)
            return null;
        if (collection === 'block_hero' && data.button_group) {
            const { data: group } = await this.database
                .from('block_button_groups')
                .select('*')
                .eq('id', data.button_group)
                .single();
            const { data: buttons } = await this.database
                .from('block_buttons')
                .select('*,page:pages(permalink),post:posts(slug)')
                .eq('button_group', data.button_group)
                .order('sort');
            return { ...data, button_group: { ...group, buttons: buttons ?? [] } };
        }
        if (collection === 'block_gallery') {
            const { data: items } = await this.database
                .from('block_gallery_items')
                .select('*,file:media_files(*)')
                .eq('block_gallery', id)
                .order('sort');
            return { ...data, items: items ?? [] };
        }
        if (collection === 'block_pricing') {
            const { data: cards } = await this.database
                .from('block_pricing_cards')
                .select('*')
                .eq('pricing', id)
                .order('sort');
            return { ...data, pricing_cards: cards ?? [] };
        }
        if (collection === 'block_posts') {
            const result = await this.listPosts(data.limit ?? 6, postPage);
            return { ...data, posts: result.data };
        }
        if (collection === 'block_events') {
            let query = this.database
                .from('events')
                .select('id,title,slug,short_description,cover_image:media_files(*),start_date,end_date,location_name,location_address,event_type,is_free,featured')
                .eq('status', 'published')
                .order('start_date')
                .limit(data.max_items ?? 10);
            if (data.filter_featured)
                query = query.eq('featured', true);
            if (!data.show_past_events)
                query = query.gte('start_date', new Date().toISOString());
            if (data.filter_by_category)
                query = query.eq('category_id', data.filter_by_category);
            const { data: events, error: eventsError } = await query;
            if (eventsError)
                throw eventsError;
            return { ...data, events: events ?? [] };
        }
        if (collection === 'block_form' && data.form) {
            const { data: form } = await this.database.from('forms').select('*').eq('id', data.form).single();
            const { data: fields } = await this.database.from('form_fields').select('*').eq('form', data.form).order('sort');
            return { ...data, form: { ...form, fields: fields ?? [] } };
        }
        return data;
    }
}
//# sourceMappingURL=content-repository.js.map