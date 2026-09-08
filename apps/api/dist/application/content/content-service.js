import { sanitizeHtml } from '@events-manager/contracts';
import { verifyPreviewToken } from '../cms/preview-token.js';
function isVisible(published_at, seo, now) {
    if (seo?.no_index)
        return false;
    if (published_at && new Date(published_at).getTime() > now.getTime())
        return false;
    return true;
}
function sitemapHints(seo) {
    const priority = seo?.sitemap?.priority;
    return {
        change_frequency: seo?.sitemap?.change_frequency ?? null,
        priority: priority === null || priority === undefined || priority === '' ? null : Number(priority),
    };
}
export class ContentService {
    repository;
    options;
    now;
    constructor(repository, options) {
        this.repository = repository;
        this.options = options;
        this.now = options.now ?? (() => new Date());
    }
    getSite() {
        return this.repository.getSite();
    }
    async getPage(permalink, postPage = 1, previewToken) {
        const now = this.now();
        const includeDrafts = Boolean(previewToken && verifyPreviewToken(this.options.previewSecret, previewToken, permalink, now));
        const page = await this.repository.getPage(permalink, postPage, { includeDrafts, now: now.toISOString() });
        const blocks = Array.isArray(page.blocks)
            ? page.blocks.map((block) => {
                if (typeof block !== 'object' || block === null)
                    return block;
                const item = block.item;
                if (block.collection === 'block_richtext' && item && typeof item === 'object' && 'content' in item) {
                    return { ...block, item: { ...item, content: sanitizeHtml(String(item.content ?? '')) } };
                }
                return block;
            })
            : page.blocks;
        return { ...page, blocks };
    }
    async getPost(slug) {
        const result = await this.repository.getPost(slug);
        if (!result.post)
            return result;
        return { ...result, post: { ...result.post, content: sanitizeHtml(result.post.content) } };
    }
    listPosts(limit, page) {
        return this.repository.listPosts(limit, page);
    }
    getRedirects() {
        return this.repository.getRedirects();
    }
    search(query) {
        if (query.length < 2)
            return Promise.resolve({ pages: [], posts: [], events: [] });
        return this.repository.search(query);
    }
    /**
     * O repositório devolve tudo que está publicado; aqui saem as entradas que
     * um robô não deve visitar (noindex) ou que ainda não chegaram à data
     * agendada, e entram as dicas de frequência/prioridade definidas no painel.
     */
    async getSitemap() {
        const { pages, posts, events } = await this.repository.getSitemap();
        const now = this.now();
        return {
            pages: pages
                .filter((page) => isVisible(page.published_at, page.seo, now))
                .map(({ permalink, published_at, date_updated, seo }) => ({
                permalink,
                published_at,
                date_updated,
                ...sitemapHints(seo),
            })),
            posts: posts
                .filter((post) => isVisible(post.published_at, post.seo, now))
                .map(({ slug, published_at, date_updated, seo }) => ({ slug, published_at, date_updated, ...sitemapHints(seo) })),
            events,
        };
    }
}
//# sourceMappingURL=content-service.js.map