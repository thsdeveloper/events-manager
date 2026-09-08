import { cmsBlockItemSchemas, sanitizeHtml, } from '@events-manager/contracts';
import { ZodError } from 'zod';
import { ApiError } from '../../shared/errors.js';
import { createPreviewToken } from './preview-token.js';
/** Menus que o layout público renderiza por id fixo. */
const PROTECTED_NAVIGATIONS = new Set(['main', 'footer']);
function notFound(message, code) {
    throw new ApiError(message, 404, code);
}
/**
 * Sanitiza os campos de HTML de um item de bloco. O tipo rich text guarda HTML
 * em `content`; os demais só têm texto simples e passam intocados.
 */
function sanitizeBlockItem(collection, item) {
    if (collection === 'block_richtext' && typeof item.content === 'string') {
        return { ...item, content: sanitizeHtml(item.content) };
    }
    return item;
}
function stampPublication(input, now) {
    if (input.status === 'published' && !input.published_at) {
        return { ...input, published_at: now.toISOString() };
    }
    return input;
}
export class CmsService {
    repository;
    options;
    now;
    constructor(repository, options) {
        this.repository = repository;
        this.options = options;
        this.now = options.now ?? (() => new Date());
    }
    audit(actorId, action, resourceType, resourceId, before, after, context) {
        return this.repository.recordAudit({ actorId, action, resourceType, resourceId, before, after, context });
    }
    // -------------------------------------------------------------------------
    // Visão geral e atividade
    // -------------------------------------------------------------------------
    overview() {
        return this.repository.countContent();
    }
    activity(resourceType, resourceId, limit = 20) {
        return this.repository.listActivity(resourceType, resourceId, limit);
    }
    // -------------------------------------------------------------------------
    // Páginas
    // -------------------------------------------------------------------------
    listPages(query) {
        return this.repository.listPages(query);
    }
    async getPage(id) {
        const page = await this.repository.getPage(id);
        return page ?? notFound('Página não encontrada.', 'PAGE_NOT_FOUND');
    }
    async assertPermalinkAvailable(permalink, exceptId) {
        const existing = await this.repository.findPageByPermalink(permalink);
        if (existing && existing.id !== exceptId) {
            throw new ApiError('Já existe uma página com este permalink.', 409, 'PERMALINK_IN_USE');
        }
    }
    async createPage(actorId, input, context) {
        await this.assertPermalinkAvailable(input.permalink);
        const page = await this.repository.createPage(stampPublication(input, this.now()));
        await this.audit(actorId, 'cms.page.create', 'page', String(page.id), null, page, context);
        return page;
    }
    async updatePage(actorId, id, input, context) {
        await this.assertPermalinkAvailable(input.permalink, id);
        const result = await this.repository.updatePage(id, stampPublication(input, this.now()));
        if (!result)
            notFound('Página não encontrada.', 'PAGE_NOT_FOUND');
        await this.audit(actorId, 'cms.page.update', 'page', id, result.before, result.data, context);
        return result.data;
    }
    async deletePage(actorId, id, context) {
        const page = await this.getPage(id);
        if (page.permalink === '/') {
            throw new ApiError('A página inicial não pode ser excluída.', 409, 'HOME_PAGE_PROTECTED');
        }
        const deleted = await this.repository.deletePage(id);
        if (!deleted)
            notFound('Página não encontrada.', 'PAGE_NOT_FOUND');
        await this.audit(actorId, 'cms.page.delete', 'page', id, deleted, null, context);
        return { success: true };
    }
    async createPreview(id) {
        const page = await this.getPage(id);
        const permalink = String(page.permalink);
        const { token, expiresAt } = createPreviewToken(this.options.previewSecret, permalink, this.now());
        const url = new URL(permalink, this.options.siteUrl);
        url.searchParams.set('preview', token);
        return { token, url: url.toString(), expiresAt };
    }
    // -------------------------------------------------------------------------
    // Blocos
    // -------------------------------------------------------------------------
    async addBlock(actorId, pageId, input, context) {
        await this.getPage(pageId);
        const existing = await this.repository.listBlockIds(pageId);
        const block = await this.repository.createBlock(pageId, {
            collection: input.collection,
            background: input.background,
            hide_block: input.hide_block,
            sort: existing.length + 1,
            item: sanitizeBlockItem(input.collection, input.item),
        });
        await this.audit(actorId, 'cms.block.create', 'page', pageId, null, block, context);
        return block;
    }
    async updateBlock(actorId, pageId, blockId, patch, context) {
        const current = await this.repository.getBlock(pageId, blockId);
        if (!current)
            notFound('Bloco não encontrado.', 'BLOCK_NOT_FOUND');
        const collection = current.collection;
        const schema = cmsBlockItemSchemas[collection];
        if (!schema)
            throw new ApiError('Tipo de bloco desconhecido.', 422, 'UNKNOWN_BLOCK');
        let item;
        if (patch.item) {
            const { id: _id, ...currentItem } = current.item ?? {};
            try {
                item = sanitizeBlockItem(collection, schema.parse({ ...currentItem, ...patch.item }));
            }
            catch (error) {
                if (error instanceof ZodError) {
                    throw new ApiError('Os dados do bloco são inválidos.', 422, 'VALIDATION_ERROR', {
                        errors: error.flatten(),
                    });
                }
                throw error;
            }
        }
        const updated = await this.repository.updateBlock(pageId, blockId, {
            ...(patch.background !== undefined ? { background: patch.background } : {}),
            ...(patch.hide_block !== undefined ? { hide_block: patch.hide_block } : {}),
            ...(item ? { item } : {}),
        });
        if (!updated)
            notFound('Bloco não encontrado.', 'BLOCK_NOT_FOUND');
        await this.audit(actorId, 'cms.block.update', 'page', pageId, current, updated, context);
        return updated;
    }
    async deleteBlock(actorId, pageId, blockId, context) {
        const deleted = await this.repository.deleteBlock(pageId, blockId);
        if (!deleted)
            notFound('Bloco não encontrado.', 'BLOCK_NOT_FOUND');
        await this.audit(actorId, 'cms.block.delete', 'page', pageId, deleted, null, context);
        return { success: true };
    }
    async reorderBlocks(actorId, pageId, order, context) {
        const current = await this.repository.listBlockIds(pageId);
        const sameSet = current.length === order.length && current.every((id) => order.includes(id));
        if (!sameSet || new Set(order).size !== order.length) {
            throw new ApiError('A ordem enviada não corresponde aos blocos da página.', 422, 'INVALID_BLOCK_ORDER');
        }
        await this.repository.setBlockOrder(pageId, order);
        await this.audit(actorId, 'cms.block.reorder', 'page', pageId, current, order, context);
        return { success: true };
    }
    // -------------------------------------------------------------------------
    // Navegação
    // -------------------------------------------------------------------------
    listNavigations() {
        return this.repository.listNavigations();
    }
    async getNavigation(id) {
        const navigation = await this.repository.getNavigation(id);
        return navigation ?? notFound('Menu não encontrado.', 'NAVIGATION_NOT_FOUND');
    }
    async createNavigation(actorId, input, context) {
        const navigation = await this.repository.createNavigation(input);
        await this.audit(actorId, 'cms.navigation.create', 'navigation', String(navigation.id), null, navigation, context);
        return navigation;
    }
    async updateNavigation(actorId, id, input, context) {
        const result = await this.repository.updateNavigation(id, input);
        if (!result)
            notFound('Menu não encontrado.', 'NAVIGATION_NOT_FOUND');
        await this.audit(actorId, 'cms.navigation.update', 'navigation', id, result.before, result.data, context);
        return result.data;
    }
    async deleteNavigation(actorId, id, context) {
        if (PROTECTED_NAVIGATIONS.has(id)) {
            throw new ApiError('Este menu é usado pelo layout do site e não pode ser excluído.', 409, 'NAVIGATION_PROTECTED');
        }
        const deleted = await this.repository.deleteNavigation(id);
        if (!deleted)
            notFound('Menu não encontrado.', 'NAVIGATION_NOT_FOUND');
        await this.audit(actorId, 'cms.navigation.delete', 'navigation', id, deleted, null, context);
        return { success: true };
    }
    async assertValidParent(navigationId, parent, itemId) {
        if (!parent)
            return;
        if (parent === itemId) {
            throw new ApiError('Um item não pode ser pai de si mesmo.', 422, 'INVALID_PARENT');
        }
        const parentItem = await this.repository.getNavigationItem(navigationId, parent);
        if (!parentItem) {
            throw new ApiError('O item pai precisa pertencer ao mesmo menu.', 422, 'INVALID_PARENT');
        }
        if (parentItem.parent) {
            throw new ApiError('O menu aceita apenas um nível de subitens.', 422, 'INVALID_PARENT');
        }
    }
    async createNavigationItem(actorId, navigationId, input, context) {
        await this.getNavigation(navigationId);
        await this.assertValidParent(navigationId, input.parent);
        const item = await this.repository.createNavigationItem(navigationId, input);
        await this.audit(actorId, 'cms.navigation.item.create', 'navigation', navigationId, null, item, context);
        return item;
    }
    async updateNavigationItem(actorId, navigationId, itemId, input, context) {
        await this.assertValidParent(navigationId, input.parent, itemId);
        const result = await this.repository.updateNavigationItem(navigationId, itemId, input);
        if (!result)
            notFound('Item de menu não encontrado.', 'NAVIGATION_ITEM_NOT_FOUND');
        await this.audit(actorId, 'cms.navigation.item.update', 'navigation', navigationId, result.before, result.data, context);
        return result.data;
    }
    async deleteNavigationItem(actorId, navigationId, itemId, context) {
        const deleted = await this.repository.deleteNavigationItem(navigationId, itemId);
        if (!deleted)
            notFound('Item de menu não encontrado.', 'NAVIGATION_ITEM_NOT_FOUND');
        await this.audit(actorId, 'cms.navigation.item.delete', 'navigation', navigationId, deleted, null, context);
        return { success: true };
    }
    async reorderNavigationItems(actorId, navigationId, parent, order, context) {
        await this.getNavigation(navigationId);
        if (new Set(order).size !== order.length) {
            throw new ApiError('A ordem enviada repete itens.', 422, 'INVALID_ITEM_ORDER');
        }
        await this.repository.setNavigationItemOrder(navigationId, parent, order);
        await this.audit(actorId, 'cms.navigation.item.reorder', 'navigation', navigationId, null, { parent, order }, context);
        return { success: true };
    }
    // -------------------------------------------------------------------------
    // Posts
    // -------------------------------------------------------------------------
    listPosts(query) {
        return this.repository.listPosts(query);
    }
    async getPost(id) {
        const post = await this.repository.getPost(id);
        return post ?? notFound('Post não encontrado.', 'POST_NOT_FOUND');
    }
    async assertSlugAvailable(slug, exceptId) {
        const existing = await this.repository.findPostBySlug(slug);
        if (existing && existing.id !== exceptId) {
            throw new ApiError('Já existe um post com este slug.', 409, 'SLUG_IN_USE');
        }
    }
    preparePost(input) {
        return {
            ...stampPublication(input, this.now()),
            // `name` é o rótulo interno herdado do template; espelha o título.
            name: input.title,
            content: input.content ? sanitizeHtml(input.content) : null,
        };
    }
    async createPost(actorId, input, context) {
        await this.assertSlugAvailable(input.slug);
        const post = await this.repository.createPost(this.preparePost(input));
        await this.audit(actorId, 'cms.post.create', 'post', String(post.id), null, post, context);
        return post;
    }
    async updatePost(actorId, id, input, context) {
        await this.assertSlugAvailable(input.slug, id);
        const result = await this.repository.updatePost(id, this.preparePost(input));
        if (!result)
            notFound('Post não encontrado.', 'POST_NOT_FOUND');
        await this.audit(actorId, 'cms.post.update', 'post', id, result.before, result.data, context);
        return result.data;
    }
    async deletePost(actorId, id, context) {
        const deleted = await this.repository.deletePost(id);
        if (!deleted)
            notFound('Post não encontrado.', 'POST_NOT_FOUND');
        await this.audit(actorId, 'cms.post.delete', 'post', id, deleted, null, context);
        return { success: true };
    }
    // -------------------------------------------------------------------------
    // Redirecionamentos
    // -------------------------------------------------------------------------
    listRedirects() {
        return this.repository.listRedirects();
    }
    async assertRedirectConsistent(input, exceptId) {
        const existing = await this.repository.findRedirectByFrom(input.url_from);
        if (existing && existing.id !== exceptId) {
            throw new ApiError('Já existe um redirecionamento para esta origem.', 409, 'REDIRECT_IN_USE');
        }
        const target = await this.repository.findRedirectByFrom(input.url_to);
        if (target && target.url_to === input.url_from) {
            throw new ApiError('Este redirecionamento criaria um ciclo com outro já existente.', 422, 'REDIRECT_LOOP');
        }
    }
    async createRedirect(actorId, input, context) {
        await this.assertRedirectConsistent(input);
        const redirect = await this.repository.createRedirect(input);
        await this.audit(actorId, 'cms.redirect.create', 'redirect', String(redirect.id), null, redirect, context);
        return redirect;
    }
    async updateRedirect(actorId, id, input, context) {
        await this.assertRedirectConsistent(input, id);
        const result = await this.repository.updateRedirect(id, input);
        if (!result)
            notFound('Redirecionamento não encontrado.', 'REDIRECT_NOT_FOUND');
        await this.audit(actorId, 'cms.redirect.update', 'redirect', id, result.before, result.data, context);
        return result.data;
    }
    async deleteRedirect(actorId, id, context) {
        const deleted = await this.repository.deleteRedirect(id);
        if (!deleted)
            notFound('Redirecionamento não encontrado.', 'REDIRECT_NOT_FOUND');
        await this.audit(actorId, 'cms.redirect.delete', 'redirect', id, deleted, null, context);
        return { success: true };
    }
    // -------------------------------------------------------------------------
    // Formulários
    // -------------------------------------------------------------------------
    listForms() {
        return this.repository.listForms();
    }
    async getForm(id) {
        const form = await this.repository.getForm(id);
        return form ?? notFound('Formulário não encontrado.', 'FORM_NOT_FOUND');
    }
    splitForm(input) {
        const { fields, ...form } = input;
        return { form: form, fields: fields.map((field, index) => ({ ...field, sort: index + 1 })) };
    }
    async createForm(actorId, input, context) {
        const { form, fields } = this.splitForm(input);
        const created = await this.repository.createForm(form, fields);
        await this.audit(actorId, 'cms.form.create', 'form', String(created.id), null, created, context);
        return created;
    }
    async updateForm(actorId, id, input, context) {
        const { form, fields } = this.splitForm(input);
        const result = await this.repository.updateForm(id, form, fields);
        if (!result)
            notFound('Formulário não encontrado.', 'FORM_NOT_FOUND');
        await this.audit(actorId, 'cms.form.update', 'form', id, result.before, result.data, context);
        return result.data;
    }
    async deleteForm(actorId, id, context) {
        const deleted = await this.repository.deleteForm(id);
        if (!deleted)
            notFound('Formulário não encontrado.', 'FORM_NOT_FOUND');
        await this.audit(actorId, 'cms.form.delete', 'form', id, deleted, null, context);
        return { success: true };
    }
    async listFormSubmissions(id, query) {
        await this.getForm(id);
        return this.repository.listFormSubmissions(id, query);
    }
    // -------------------------------------------------------------------------
    // Mídia
    // -------------------------------------------------------------------------
    listMedia(query) {
        return this.repository.listMedia(query);
    }
    async updateMedia(actorId, id, input, context) {
        const result = await this.repository.updateMedia(id, input);
        if (!result)
            notFound('Arquivo não encontrado.', 'MEDIA_NOT_FOUND');
        await this.audit(actorId, 'cms.media.update', 'media', id, result.before, result.data, context);
        return result.data;
    }
    async deleteMedia(actorId, id, context) {
        const deleted = await this.repository.deleteMedia(id);
        if (!deleted)
            notFound('Arquivo não encontrado.', 'MEDIA_NOT_FOUND');
        await this.audit(actorId, 'cms.media.delete', 'media', id, deleted, null, context);
        return { success: true };
    }
    // -------------------------------------------------------------------------
    // Configurações do site
    // -------------------------------------------------------------------------
    getSiteSettings() {
        return this.repository.getSiteSettings();
    }
    async updateSiteSettings(actorId, input, context) {
        const result = await this.repository.updateSiteSettings(input);
        await this.audit(actorId, 'cms.site.update', 'site_settings', String(result.data.id ?? ''), result.before, result.data, context);
        return result.data;
    }
}
//# sourceMappingURL=cms-service.js.map