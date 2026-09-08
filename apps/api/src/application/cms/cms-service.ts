import {
	cmsBlockItemSchemas,
	sanitizeHtml,
	type CmsBlockCollection,
	type CmsFormInput,
	type CmsListQuery,
	type CmsNavigationItemInput,
	type CmsPageBlockInput,
	type CmsPageInput,
	type CmsPostInput,
	type CmsRedirectInput,
	type CmsSiteSettingsInput,
} from '@events-manager/contracts';
import { ZodError } from 'zod';
import { ApiError } from '../../shared/errors.js';
import { createPreviewToken } from './preview-token.js';

export type Row = Record<string, unknown>;

export interface CmsAuditContext {
	ip: string;
	userAgent: string | null;
}

export interface CmsBlockPatch {
	background?: 'light' | 'dark';
	hide_block?: boolean;
	item?: Row;
}

/**
 * Porta de persistência do CMS. Cada método devolve linhas já prontas para a
 * resposta HTTP; a regra de negócio (unicidade, proteção da home, sanitização,
 * auditoria) vive no serviço, para ser testada sem banco.
 */
export interface CmsRepository {
	listPages(query: CmsListQuery): Promise<{ data: Row[]; total: number }>;
	getPage(id: string): Promise<Row | null>;
	findPageByPermalink(permalink: string): Promise<{ id: string } | null>;
	createPage(input: Row): Promise<Row>;
	updatePage(id: string, input: Row): Promise<{ before: Row; data: Row } | null>;
	deletePage(id: string): Promise<Row | null>;

	listBlockIds(pageId: string): Promise<string[]>;
	createBlock(pageId: string, block: Row): Promise<Row>;
	getBlock(pageId: string, blockId: string): Promise<Row | null>;
	updateBlock(pageId: string, blockId: string, patch: CmsBlockPatch): Promise<Row | null>;
	deleteBlock(pageId: string, blockId: string): Promise<Row | null>;
	setBlockOrder(pageId: string, order: string[]): Promise<void>;

	listNavigations(): Promise<Row[]>;
	getNavigation(id: string): Promise<Row | null>;
	createNavigation(input: Row): Promise<Row>;
	updateNavigation(id: string, input: Row): Promise<{ before: Row; data: Row } | null>;
	deleteNavigation(id: string): Promise<Row | null>;
	getNavigationItem(navigationId: string, itemId: string): Promise<Row | null>;
	createNavigationItem(navigationId: string, input: Row): Promise<Row>;
	updateNavigationItem(navigationId: string, itemId: string, input: Row): Promise<{ before: Row; data: Row } | null>;
	deleteNavigationItem(navigationId: string, itemId: string): Promise<Row | null>;
	setNavigationItemOrder(navigationId: string, parent: string | null, order: string[]): Promise<void>;

	listPosts(query: CmsListQuery): Promise<{ data: Row[]; total: number }>;
	getPost(id: string): Promise<Row | null>;
	findPostBySlug(slug: string): Promise<{ id: string } | null>;
	createPost(input: Row): Promise<Row>;
	updatePost(id: string, input: Row): Promise<{ before: Row; data: Row } | null>;
	deletePost(id: string): Promise<Row | null>;

	listRedirects(): Promise<Row[]>;
	findRedirectByFrom(urlFrom: string): Promise<(Row & { id: string }) | null>;
	createRedirect(input: Row): Promise<Row>;
	updateRedirect(id: string, input: Row): Promise<{ before: Row; data: Row } | null>;
	deleteRedirect(id: string): Promise<Row | null>;

	listForms(): Promise<Row[]>;
	getForm(id: string): Promise<Row | null>;
	createForm(input: Row, fields: Row[]): Promise<Row>;
	updateForm(id: string, input: Row, fields: Row[]): Promise<{ before: Row; data: Row } | null>;
	deleteForm(id: string): Promise<Row | null>;
	listFormSubmissions(formId: string, query: { page: number; limit: number }): Promise<{ data: Row[]; total: number }>;

	listMedia(query: { page: number; limit: number; search: string }): Promise<{ data: Row[]; total: number }>;
	updateMedia(id: string, input: Row): Promise<{ before: Row; data: Row } | null>;
	deleteMedia(id: string): Promise<Row | null>;

	getSiteSettings(): Promise<Row | null>;
	updateSiteSettings(input: Row): Promise<{ before: Row; data: Row }>;

	countContent(): Promise<Row>;
	listActivity(resourceType: string, resourceId: string, limit: number): Promise<Row[]>;
	recordAudit(input: {
		action: string;
		actorId: string;
		after: unknown;
		before: unknown;
		context: CmsAuditContext;
		resourceId: string | null;
		resourceType: string;
	}): Promise<void>;
}

export interface CmsServiceOptions {
	/** Segredo que assina os links de pré-visualização de rascunhos. */
	previewSecret: string;
	/** URL pública do site, base dos links de preview. */
	siteUrl: string;
	now?: () => Date;
}

/** Menus que o layout público renderiza por id fixo. */
const PROTECTED_NAVIGATIONS = new Set(['main', 'footer']);

function notFound(message: string, code: string): never {
	throw new ApiError(message, 404, code);
}

/**
 * Sanitiza os campos de HTML de um item de bloco. O tipo rich text guarda HTML
 * em `content`; os demais só têm texto simples e passam intocados.
 */
function sanitizeBlockItem(collection: CmsBlockCollection, item: Row): Row {
	if (collection === 'block_richtext' && typeof item.content === 'string') {
		return { ...item, content: sanitizeHtml(item.content) };
	}
	return item;
}

function stampPublication(input: { status: string; published_at: string | null }, now: Date) {
	if (input.status === 'published' && !input.published_at) {
		return { ...input, published_at: now.toISOString() };
	}
	return input;
}

export class CmsService {
	private readonly now: () => Date;

	constructor(
		private readonly repository: CmsRepository,
		private readonly options: CmsServiceOptions,
	) {
		this.now = options.now ?? (() => new Date());
	}

	private audit(
		actorId: string,
		action: string,
		resourceType: string,
		resourceId: string | null,
		before: unknown,
		after: unknown,
		context: CmsAuditContext,
	) {
		return this.repository.recordAudit({ actorId, action, resourceType, resourceId, before, after, context });
	}

	// -------------------------------------------------------------------------
	// Visão geral e atividade
	// -------------------------------------------------------------------------

	overview() {
		return this.repository.countContent();
	}

	activity(resourceType: string, resourceId: string, limit = 20) {
		return this.repository.listActivity(resourceType, resourceId, limit);
	}

	// -------------------------------------------------------------------------
	// Páginas
	// -------------------------------------------------------------------------

	listPages(query: CmsListQuery) {
		return this.repository.listPages(query);
	}

	async getPage(id: string) {
		const page = await this.repository.getPage(id);
		return page ?? notFound('Página não encontrada.', 'PAGE_NOT_FOUND');
	}

	private async assertPermalinkAvailable(permalink: string, exceptId?: string) {
		const existing = await this.repository.findPageByPermalink(permalink);
		if (existing && existing.id !== exceptId) {
			throw new ApiError('Já existe uma página com este permalink.', 409, 'PERMALINK_IN_USE');
		}
	}

	async createPage(actorId: string, input: CmsPageInput, context: CmsAuditContext) {
		await this.assertPermalinkAvailable(input.permalink);
		const page = await this.repository.createPage(stampPublication(input, this.now()) as Row);
		await this.audit(actorId, 'cms.page.create', 'page', String(page.id), null, page, context);
		return page;
	}

	async updatePage(actorId: string, id: string, input: CmsPageInput, context: CmsAuditContext) {
		await this.assertPermalinkAvailable(input.permalink, id);
		const result = await this.repository.updatePage(id, stampPublication(input, this.now()) as Row);
		if (!result) notFound('Página não encontrada.', 'PAGE_NOT_FOUND');
		await this.audit(actorId, 'cms.page.update', 'page', id, result.before, result.data, context);
		return result.data;
	}

	async deletePage(actorId: string, id: string, context: CmsAuditContext) {
		const page = await this.getPage(id);
		if (page.permalink === '/') {
			throw new ApiError('A página inicial não pode ser excluída.', 409, 'HOME_PAGE_PROTECTED');
		}
		const deleted = await this.repository.deletePage(id);
		if (!deleted) notFound('Página não encontrada.', 'PAGE_NOT_FOUND');
		await this.audit(actorId, 'cms.page.delete', 'page', id, deleted, null, context);
		return { success: true };
	}

	async createPreview(id: string) {
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

	async addBlock(actorId: string, pageId: string, input: CmsPageBlockInput, context: CmsAuditContext) {
		await this.getPage(pageId);
		const existing = await this.repository.listBlockIds(pageId);
		const block = await this.repository.createBlock(pageId, {
			collection: input.collection,
			background: input.background,
			hide_block: input.hide_block,
			sort: existing.length + 1,
			item: sanitizeBlockItem(input.collection, input.item as Row),
		});
		await this.audit(actorId, 'cms.block.create', 'page', pageId, null, block, context);
		return block;
	}

	async updateBlock(actorId: string, pageId: string, blockId: string, patch: CmsBlockPatch, context: CmsAuditContext) {
		const current = await this.repository.getBlock(pageId, blockId);
		if (!current) notFound('Bloco não encontrado.', 'BLOCK_NOT_FOUND');
		const collection = current.collection as CmsBlockCollection;
		const schema = cmsBlockItemSchemas[collection];
		if (!schema) throw new ApiError('Tipo de bloco desconhecido.', 422, 'UNKNOWN_BLOCK');

		let item: Row | undefined;
		if (patch.item) {
			const { id: _id, ...currentItem } = (current.item as Row) ?? {};
			try {
				item = sanitizeBlockItem(collection, schema.parse({ ...currentItem, ...patch.item }) as Row);
			} catch (error) {
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
		if (!updated) notFound('Bloco não encontrado.', 'BLOCK_NOT_FOUND');
		await this.audit(actorId, 'cms.block.update', 'page', pageId, current, updated, context);
		return updated;
	}

	async deleteBlock(actorId: string, pageId: string, blockId: string, context: CmsAuditContext) {
		const deleted = await this.repository.deleteBlock(pageId, blockId);
		if (!deleted) notFound('Bloco não encontrado.', 'BLOCK_NOT_FOUND');
		await this.audit(actorId, 'cms.block.delete', 'page', pageId, deleted, null, context);
		return { success: true };
	}

	async reorderBlocks(actorId: string, pageId: string, order: string[], context: CmsAuditContext) {
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

	async getNavigation(id: string) {
		const navigation = await this.repository.getNavigation(id);
		return navigation ?? notFound('Menu não encontrado.', 'NAVIGATION_NOT_FOUND');
	}

	async createNavigation(actorId: string, input: Row, context: CmsAuditContext) {
		const navigation = await this.repository.createNavigation(input);
		await this.audit(actorId, 'cms.navigation.create', 'navigation', String(navigation.id), null, navigation, context);
		return navigation;
	}

	async updateNavigation(actorId: string, id: string, input: Row, context: CmsAuditContext) {
		const result = await this.repository.updateNavigation(id, input);
		if (!result) notFound('Menu não encontrado.', 'NAVIGATION_NOT_FOUND');
		await this.audit(actorId, 'cms.navigation.update', 'navigation', id, result.before, result.data, context);
		return result.data;
	}

	async deleteNavigation(actorId: string, id: string, context: CmsAuditContext) {
		if (PROTECTED_NAVIGATIONS.has(id)) {
			throw new ApiError('Este menu é usado pelo layout do site e não pode ser excluído.', 409, 'NAVIGATION_PROTECTED');
		}
		const deleted = await this.repository.deleteNavigation(id);
		if (!deleted) notFound('Menu não encontrado.', 'NAVIGATION_NOT_FOUND');
		await this.audit(actorId, 'cms.navigation.delete', 'navigation', id, deleted, null, context);
		return { success: true };
	}

	private async assertValidParent(navigationId: string, parent: string | null | undefined, itemId?: string) {
		if (!parent) return;
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

	async createNavigationItem(
		actorId: string,
		navigationId: string,
		input: CmsNavigationItemInput,
		context: CmsAuditContext,
	) {
		await this.getNavigation(navigationId);
		await this.assertValidParent(navigationId, input.parent);
		const item = await this.repository.createNavigationItem(navigationId, input as Row);
		await this.audit(actorId, 'cms.navigation.item.create', 'navigation', navigationId, null, item, context);
		return item;
	}

	async updateNavigationItem(
		actorId: string,
		navigationId: string,
		itemId: string,
		input: CmsNavigationItemInput,
		context: CmsAuditContext,
	) {
		await this.assertValidParent(navigationId, input.parent, itemId);
		const result = await this.repository.updateNavigationItem(navigationId, itemId, input as Row);
		if (!result) notFound('Item de menu não encontrado.', 'NAVIGATION_ITEM_NOT_FOUND');
		await this.audit(actorId, 'cms.navigation.item.update', 'navigation', navigationId, result.before, result.data, context);
		return result.data;
	}

	async deleteNavigationItem(actorId: string, navigationId: string, itemId: string, context: CmsAuditContext) {
		const deleted = await this.repository.deleteNavigationItem(navigationId, itemId);
		if (!deleted) notFound('Item de menu não encontrado.', 'NAVIGATION_ITEM_NOT_FOUND');
		await this.audit(actorId, 'cms.navigation.item.delete', 'navigation', navigationId, deleted, null, context);
		return { success: true };
	}

	async reorderNavigationItems(
		actorId: string,
		navigationId: string,
		parent: string | null,
		order: string[],
		context: CmsAuditContext,
	) {
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

	listPosts(query: CmsListQuery) {
		return this.repository.listPosts(query);
	}

	async getPost(id: string) {
		const post = await this.repository.getPost(id);
		return post ?? notFound('Post não encontrado.', 'POST_NOT_FOUND');
	}

	private async assertSlugAvailable(slug: string, exceptId?: string) {
		const existing = await this.repository.findPostBySlug(slug);
		if (existing && existing.id !== exceptId) {
			throw new ApiError('Já existe um post com este slug.', 409, 'SLUG_IN_USE');
		}
	}

	private preparePost(input: CmsPostInput) {
		return {
			...stampPublication(input, this.now()),
			// `name` é o rótulo interno herdado do template; espelha o título.
			name: input.title,
			content: input.content ? sanitizeHtml(input.content) : null,
		};
	}

	async createPost(actorId: string, input: CmsPostInput, context: CmsAuditContext) {
		await this.assertSlugAvailable(input.slug);
		const post = await this.repository.createPost(this.preparePost(input) as Row);
		await this.audit(actorId, 'cms.post.create', 'post', String(post.id), null, post, context);
		return post;
	}

	async updatePost(actorId: string, id: string, input: CmsPostInput, context: CmsAuditContext) {
		await this.assertSlugAvailable(input.slug, id);
		const result = await this.repository.updatePost(id, this.preparePost(input) as Row);
		if (!result) notFound('Post não encontrado.', 'POST_NOT_FOUND');
		await this.audit(actorId, 'cms.post.update', 'post', id, result.before, result.data, context);
		return result.data;
	}

	async deletePost(actorId: string, id: string, context: CmsAuditContext) {
		const deleted = await this.repository.deletePost(id);
		if (!deleted) notFound('Post não encontrado.', 'POST_NOT_FOUND');
		await this.audit(actorId, 'cms.post.delete', 'post', id, deleted, null, context);
		return { success: true };
	}

	// -------------------------------------------------------------------------
	// Redirecionamentos
	// -------------------------------------------------------------------------

	listRedirects() {
		return this.repository.listRedirects();
	}

	private async assertRedirectConsistent(input: CmsRedirectInput, exceptId?: string) {
		const existing = await this.repository.findRedirectByFrom(input.url_from);
		if (existing && existing.id !== exceptId) {
			throw new ApiError('Já existe um redirecionamento para esta origem.', 409, 'REDIRECT_IN_USE');
		}
		const target = await this.repository.findRedirectByFrom(input.url_to);
		if (target && target.url_to === input.url_from) {
			throw new ApiError('Este redirecionamento criaria um ciclo com outro já existente.', 422, 'REDIRECT_LOOP');
		}
	}

	async createRedirect(actorId: string, input: CmsRedirectInput, context: CmsAuditContext) {
		await this.assertRedirectConsistent(input);
		const redirect = await this.repository.createRedirect(input as Row);
		await this.audit(actorId, 'cms.redirect.create', 'redirect', String(redirect.id), null, redirect, context);
		return redirect;
	}

	async updateRedirect(actorId: string, id: string, input: CmsRedirectInput, context: CmsAuditContext) {
		await this.assertRedirectConsistent(input, id);
		const result = await this.repository.updateRedirect(id, input as Row);
		if (!result) notFound('Redirecionamento não encontrado.', 'REDIRECT_NOT_FOUND');
		await this.audit(actorId, 'cms.redirect.update', 'redirect', id, result.before, result.data, context);
		return result.data;
	}

	async deleteRedirect(actorId: string, id: string, context: CmsAuditContext) {
		const deleted = await this.repository.deleteRedirect(id);
		if (!deleted) notFound('Redirecionamento não encontrado.', 'REDIRECT_NOT_FOUND');
		await this.audit(actorId, 'cms.redirect.delete', 'redirect', id, deleted, null, context);
		return { success: true };
	}

	// -------------------------------------------------------------------------
	// Formulários
	// -------------------------------------------------------------------------

	listForms() {
		return this.repository.listForms();
	}

	async getForm(id: string) {
		const form = await this.repository.getForm(id);
		return form ?? notFound('Formulário não encontrado.', 'FORM_NOT_FOUND');
	}

	private splitForm(input: CmsFormInput) {
		const { fields, ...form } = input;
		return { form: form as Row, fields: fields.map((field, index) => ({ ...field, sort: index + 1 }) as Row) };
	}

	async createForm(actorId: string, input: CmsFormInput, context: CmsAuditContext) {
		const { form, fields } = this.splitForm(input);
		const created = await this.repository.createForm(form, fields);
		await this.audit(actorId, 'cms.form.create', 'form', String(created.id), null, created, context);
		return created;
	}

	async updateForm(actorId: string, id: string, input: CmsFormInput, context: CmsAuditContext) {
		const { form, fields } = this.splitForm(input);
		const result = await this.repository.updateForm(id, form, fields);
		if (!result) notFound('Formulário não encontrado.', 'FORM_NOT_FOUND');
		await this.audit(actorId, 'cms.form.update', 'form', id, result.before, result.data, context);
		return result.data;
	}

	async deleteForm(actorId: string, id: string, context: CmsAuditContext) {
		const deleted = await this.repository.deleteForm(id);
		if (!deleted) notFound('Formulário não encontrado.', 'FORM_NOT_FOUND');
		await this.audit(actorId, 'cms.form.delete', 'form', id, deleted, null, context);
		return { success: true };
	}

	async listFormSubmissions(id: string, query: { page: number; limit: number }) {
		await this.getForm(id);
		return this.repository.listFormSubmissions(id, query);
	}

	// -------------------------------------------------------------------------
	// Mídia
	// -------------------------------------------------------------------------

	listMedia(query: { page: number; limit: number; search: string }) {
		return this.repository.listMedia(query);
	}

	async updateMedia(actorId: string, id: string, input: Row, context: CmsAuditContext) {
		const result = await this.repository.updateMedia(id, input);
		if (!result) notFound('Arquivo não encontrado.', 'MEDIA_NOT_FOUND');
		await this.audit(actorId, 'cms.media.update', 'media', id, result.before, result.data, context);
		return result.data;
	}

	async deleteMedia(actorId: string, id: string, context: CmsAuditContext) {
		const deleted = await this.repository.deleteMedia(id);
		if (!deleted) notFound('Arquivo não encontrado.', 'MEDIA_NOT_FOUND');
		await this.audit(actorId, 'cms.media.delete', 'media', id, deleted, null, context);
		return { success: true };
	}

	// -------------------------------------------------------------------------
	// Configurações do site
	// -------------------------------------------------------------------------

	getSiteSettings() {
		return this.repository.getSiteSettings();
	}

	async updateSiteSettings(actorId: string, input: CmsSiteSettingsInput, context: CmsAuditContext) {
		const result = await this.repository.updateSiteSettings(input as Row);
		await this.audit(actorId, 'cms.site.update', 'site_settings', String(result.data.id ?? ''), result.before, result.data, context);
		return result.data;
	}
}
