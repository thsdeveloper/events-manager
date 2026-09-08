import { cmsFormInputSchema, cmsListQuerySchema, cmsNavigationInputSchema, cmsNavigationItemInputSchema, cmsPageBlockInputSchema, cmsPageBlockUpdateSchema, cmsPageInputSchema, cmsPostInputSchema, cmsRedirectInputSchema, cmsReorderSchema, cmsSiteSettingsInputSchema, } from '@events-manager/contracts';
import { z } from 'zod';
import { CmsService } from '../application/cms/cms-service.js';
import { createSupabaseAuthService } from '../infrastructure/supabase/auth-repository.js';
import { SupabaseCmsRepository } from '../infrastructure/supabase/cms-repository.js';
import { requireSuperAdmin } from './auth-context.js';
const idParams = z.object({ id: z.string().uuid() });
const navigationParams = z.object({ id: z.string().regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/) });
const blockParams = idParams.extend({ blockId: z.string().uuid() });
const itemParams = navigationParams.extend({ itemId: z.string().uuid() });
const pageQuery = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});
const mediaQuery = pageQuery.extend({ search: z.string().trim().max(100).default('') });
const mediaInput = z.object({
    title: z.string().trim().max(150).nullable().optional(),
    description: z.string().trim().max(500).nullable().optional(),
});
function auditContext(request) {
    return { ip: request.ip, userAgent: request.headers['user-agent'] ?? null };
}
function paginate(result, query) {
    return {
        data: result.data,
        pagination: {
            page: query.page,
            limit: query.limit,
            total: result.total,
            pageCount: Math.max(1, Math.ceil(result.total / query.limit)),
        },
    };
}
/**
 * Gestão de conteúdo (CMS) exclusiva do superadmin: páginas e seus blocos,
 * menus, posts, formulários, redirecionamentos, mídia e identidade do site.
 * Toda mutação é auditada em `audit_logs` com o estado anterior e o novo.
 */
export async function cmsRoutes(app, options) {
    const { clients, env } = options;
    const auth = createSupabaseAuthService(clients);
    const service = new CmsService(new SupabaseCmsRepository(clients), {
        previewSecret: env.COOKIE_SECRET,
        siteUrl: env.WEB_URL,
    });
    const base = '/api/super-admin/cms';
    // -------------------------------------------------------------------------
    // Visão geral
    // -------------------------------------------------------------------------
    app.get(`${base}/overview`, async (request) => {
        await requireSuperAdmin(request, auth);
        return service.overview();
    });
    // -------------------------------------------------------------------------
    // Páginas
    // -------------------------------------------------------------------------
    app.get(`${base}/pages`, async (request) => {
        await requireSuperAdmin(request, auth);
        const query = cmsListQuerySchema.parse(request.query);
        return paginate(await service.listPages(query), query);
    });
    app.post(`${base}/pages`, async (request, reply) => {
        const admin = await requireSuperAdmin(request, auth);
        const input = cmsPageInputSchema.parse(request.body);
        return reply.code(201).send(await service.createPage(admin.user.id, input, auditContext(request)));
    });
    app.get(`${base}/pages/:id`, async (request) => {
        await requireSuperAdmin(request, auth);
        const { id } = idParams.parse(request.params);
        return service.getPage(id);
    });
    app.patch(`${base}/pages/:id`, async (request) => {
        const admin = await requireSuperAdmin(request, auth);
        const { id } = idParams.parse(request.params);
        const input = cmsPageInputSchema.parse(request.body);
        return service.updatePage(admin.user.id, id, input, auditContext(request));
    });
    app.delete(`${base}/pages/:id`, async (request) => {
        const admin = await requireSuperAdmin(request, auth);
        const { id } = idParams.parse(request.params);
        return service.deletePage(admin.user.id, id, auditContext(request));
    });
    app.post(`${base}/pages/:id/preview`, async (request, reply) => {
        await requireSuperAdmin(request, auth);
        const { id } = idParams.parse(request.params);
        return reply.code(201).send(await service.createPreview(id));
    });
    app.get(`${base}/pages/:id/activity`, async (request) => {
        await requireSuperAdmin(request, auth);
        const { id } = idParams.parse(request.params);
        return { data: await service.activity('page', id) };
    });
    app.post(`${base}/pages/:id/blocks`, async (request, reply) => {
        const admin = await requireSuperAdmin(request, auth);
        const { id } = idParams.parse(request.params);
        const input = cmsPageBlockInputSchema.parse(request.body);
        return reply.code(201).send(await service.addBlock(admin.user.id, id, input, auditContext(request)));
    });
    app.put(`${base}/pages/:id/blocks/order`, async (request) => {
        const admin = await requireSuperAdmin(request, auth);
        const { id } = idParams.parse(request.params);
        const { order } = cmsReorderSchema.parse(request.body);
        return service.reorderBlocks(admin.user.id, id, order, auditContext(request));
    });
    app.patch(`${base}/pages/:id/blocks/:blockId`, async (request) => {
        const admin = await requireSuperAdmin(request, auth);
        const { id, blockId } = blockParams.parse(request.params);
        const patch = cmsPageBlockUpdateSchema.parse(request.body);
        return service.updateBlock(admin.user.id, id, blockId, patch, auditContext(request));
    });
    app.delete(`${base}/pages/:id/blocks/:blockId`, async (request) => {
        const admin = await requireSuperAdmin(request, auth);
        const { id, blockId } = blockParams.parse(request.params);
        return service.deleteBlock(admin.user.id, id, blockId, auditContext(request));
    });
    // -------------------------------------------------------------------------
    // Menus
    // -------------------------------------------------------------------------
    app.get(`${base}/navigation`, async (request) => {
        await requireSuperAdmin(request, auth);
        return { data: await service.listNavigations() };
    });
    app.post(`${base}/navigation`, async (request, reply) => {
        const admin = await requireSuperAdmin(request, auth);
        const input = cmsNavigationInputSchema.parse(request.body);
        return reply.code(201).send(await service.createNavigation(admin.user.id, input, auditContext(request)));
    });
    app.get(`${base}/navigation/:id`, async (request) => {
        await requireSuperAdmin(request, auth);
        const { id } = navigationParams.parse(request.params);
        return service.getNavigation(id);
    });
    app.patch(`${base}/navigation/:id`, async (request) => {
        const admin = await requireSuperAdmin(request, auth);
        const { id } = navigationParams.parse(request.params);
        const input = cmsNavigationInputSchema.omit({ id: true }).parse(request.body);
        return service.updateNavigation(admin.user.id, id, input, auditContext(request));
    });
    app.delete(`${base}/navigation/:id`, async (request) => {
        const admin = await requireSuperAdmin(request, auth);
        const { id } = navigationParams.parse(request.params);
        return service.deleteNavigation(admin.user.id, id, auditContext(request));
    });
    app.post(`${base}/navigation/:id/items`, async (request, reply) => {
        const admin = await requireSuperAdmin(request, auth);
        const { id } = navigationParams.parse(request.params);
        const input = cmsNavigationItemInputSchema.parse(request.body);
        return reply.code(201).send(await service.createNavigationItem(admin.user.id, id, input, auditContext(request)));
    });
    app.put(`${base}/navigation/:id/items/order`, async (request) => {
        const admin = await requireSuperAdmin(request, auth);
        const { id } = navigationParams.parse(request.params);
        const { order, parent } = cmsReorderSchema.extend({ parent: z.string().uuid().nullable().default(null) }).parse(request.body);
        return service.reorderNavigationItems(admin.user.id, id, parent, order, auditContext(request));
    });
    app.patch(`${base}/navigation/:id/items/:itemId`, async (request) => {
        const admin = await requireSuperAdmin(request, auth);
        const { id, itemId } = itemParams.parse(request.params);
        const input = cmsNavigationItemInputSchema.parse(request.body);
        return service.updateNavigationItem(admin.user.id, id, itemId, input, auditContext(request));
    });
    app.delete(`${base}/navigation/:id/items/:itemId`, async (request) => {
        const admin = await requireSuperAdmin(request, auth);
        const { id, itemId } = itemParams.parse(request.params);
        return service.deleteNavigationItem(admin.user.id, id, itemId, auditContext(request));
    });
    // -------------------------------------------------------------------------
    // Posts
    // -------------------------------------------------------------------------
    app.get(`${base}/posts`, async (request) => {
        await requireSuperAdmin(request, auth);
        const query = cmsListQuerySchema.parse(request.query);
        return paginate(await service.listPosts(query), query);
    });
    app.post(`${base}/posts`, async (request, reply) => {
        const admin = await requireSuperAdmin(request, auth);
        const input = cmsPostInputSchema.parse(request.body);
        return reply.code(201).send(await service.createPost(admin.user.id, input, auditContext(request)));
    });
    app.get(`${base}/posts/:id`, async (request) => {
        await requireSuperAdmin(request, auth);
        const { id } = idParams.parse(request.params);
        return service.getPost(id);
    });
    app.patch(`${base}/posts/:id`, async (request) => {
        const admin = await requireSuperAdmin(request, auth);
        const { id } = idParams.parse(request.params);
        const input = cmsPostInputSchema.parse(request.body);
        return service.updatePost(admin.user.id, id, input, auditContext(request));
    });
    app.delete(`${base}/posts/:id`, async (request) => {
        const admin = await requireSuperAdmin(request, auth);
        const { id } = idParams.parse(request.params);
        return service.deletePost(admin.user.id, id, auditContext(request));
    });
    // -------------------------------------------------------------------------
    // Redirecionamentos
    // -------------------------------------------------------------------------
    app.get(`${base}/redirects`, async (request) => {
        await requireSuperAdmin(request, auth);
        return { data: await service.listRedirects() };
    });
    app.post(`${base}/redirects`, async (request, reply) => {
        const admin = await requireSuperAdmin(request, auth);
        const input = cmsRedirectInputSchema.parse(request.body);
        return reply.code(201).send(await service.createRedirect(admin.user.id, input, auditContext(request)));
    });
    app.patch(`${base}/redirects/:id`, async (request) => {
        const admin = await requireSuperAdmin(request, auth);
        const { id } = idParams.parse(request.params);
        const input = cmsRedirectInputSchema.parse(request.body);
        return service.updateRedirect(admin.user.id, id, input, auditContext(request));
    });
    app.delete(`${base}/redirects/:id`, async (request) => {
        const admin = await requireSuperAdmin(request, auth);
        const { id } = idParams.parse(request.params);
        return service.deleteRedirect(admin.user.id, id, auditContext(request));
    });
    // -------------------------------------------------------------------------
    // Formulários
    // -------------------------------------------------------------------------
    app.get(`${base}/forms`, async (request) => {
        await requireSuperAdmin(request, auth);
        return { data: await service.listForms() };
    });
    app.post(`${base}/forms`, async (request, reply) => {
        const admin = await requireSuperAdmin(request, auth);
        const input = cmsFormInputSchema.parse(request.body);
        return reply.code(201).send(await service.createForm(admin.user.id, input, auditContext(request)));
    });
    app.get(`${base}/forms/:id`, async (request) => {
        await requireSuperAdmin(request, auth);
        const { id } = idParams.parse(request.params);
        return service.getForm(id);
    });
    app.patch(`${base}/forms/:id`, async (request) => {
        const admin = await requireSuperAdmin(request, auth);
        const { id } = idParams.parse(request.params);
        const input = cmsFormInputSchema.parse(request.body);
        return service.updateForm(admin.user.id, id, input, auditContext(request));
    });
    app.delete(`${base}/forms/:id`, async (request) => {
        const admin = await requireSuperAdmin(request, auth);
        const { id } = idParams.parse(request.params);
        return service.deleteForm(admin.user.id, id, auditContext(request));
    });
    app.get(`${base}/forms/:id/submissions`, async (request) => {
        await requireSuperAdmin(request, auth);
        const { id } = idParams.parse(request.params);
        const query = pageQuery.parse(request.query);
        return paginate(await service.listFormSubmissions(id, query), query);
    });
    // -------------------------------------------------------------------------
    // Mídia
    // -------------------------------------------------------------------------
    app.get(`${base}/media`, async (request) => {
        await requireSuperAdmin(request, auth);
        const query = mediaQuery.parse(request.query);
        return paginate(await service.listMedia(query), query);
    });
    app.patch(`${base}/media/:id`, async (request) => {
        const admin = await requireSuperAdmin(request, auth);
        const { id } = idParams.parse(request.params);
        const input = mediaInput.parse(request.body);
        return service.updateMedia(admin.user.id, id, input, auditContext(request));
    });
    app.delete(`${base}/media/:id`, async (request) => {
        const admin = await requireSuperAdmin(request, auth);
        const { id } = idParams.parse(request.params);
        return service.deleteMedia(admin.user.id, id, auditContext(request));
    });
    // -------------------------------------------------------------------------
    // Configurações do site
    // -------------------------------------------------------------------------
    app.get(`${base}/site`, async (request) => {
        await requireSuperAdmin(request, auth);
        return service.getSiteSettings();
    });
    app.patch(`${base}/site`, async (request) => {
        const admin = await requireSuperAdmin(request, auth);
        const input = cmsSiteSettingsInputSchema.parse(request.body);
        return service.updateSiteSettings(admin.user.id, input, auditContext(request));
    });
}
//# sourceMappingURL=cms.js.map