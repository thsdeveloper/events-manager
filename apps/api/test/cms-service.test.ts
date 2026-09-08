import { describe, expect, it, vi } from 'vitest';
import { CmsService, type CmsRepository } from '../src/application/cms/cms-service.js';
import { verifyPreviewToken } from '../src/application/cms/preview-token.js';
import { ApiError } from '../src/shared/errors.js';
import { fakePort, TEST_USER_ID } from './support/index.js';

const context = { ip: '127.0.0.1', userAgent: 'vitest' };
const now = new Date('2026-09-05T12:00:00.000Z');
const PAGE_ID = '00000000-0000-4000-8000-000000000100';
const BLOCK_ID = '00000000-0000-4000-8000-000000000200';
const ITEM_ID = '00000000-0000-4000-8000-000000000300';

const repositoryMethods: Array<keyof CmsRepository> = [
	'listPages',
	'getPage',
	'findPageByPermalink',
	'createPage',
	'updatePage',
	'deletePage',
	'listBlockIds',
	'createBlock',
	'getBlock',
	'updateBlock',
	'deleteBlock',
	'setBlockOrder',
	'listNavigations',
	'getNavigation',
	'createNavigation',
	'updateNavigation',
	'deleteNavigation',
	'getNavigationItem',
	'createNavigationItem',
	'updateNavigationItem',
	'deleteNavigationItem',
	'setNavigationItemOrder',
	'listPosts',
	'getPost',
	'findPostBySlug',
	'createPost',
	'updatePost',
	'deletePost',
	'listRedirects',
	'findRedirectByFrom',
	'createRedirect',
	'updateRedirect',
	'deleteRedirect',
	'listForms',
	'getForm',
	'createForm',
	'updateForm',
	'deleteForm',
	'listFormSubmissions',
	'listMedia',
	'updateMedia',
	'deleteMedia',
	'getSiteSettings',
	'updateSiteSettings',
	'countContent',
	'listActivity',
	'recordAudit',
];

function setup() {
	const repository = fakePort<CmsRepository>(repositoryMethods);
	repository.recordAudit.mockResolvedValue(undefined);
	const service = new CmsService(repository as unknown as CmsRepository, {
		previewSecret: 'test-cookie-secret-value',
		siteUrl: 'http://localhost:3003',
		now: () => now,
	});
	return { repository, service };
}

async function expectApiError(promise: Promise<unknown>, status: number, code: string) {
	await expect(promise).rejects.toMatchObject({ statusCode: status, code });
	await expect(promise).rejects.toBeInstanceOf(ApiError);
}

describe('CmsService pages', () => {
	it('creates a page with a unique permalink, stamps the publication date and audits the change', async () => {
		const { repository, service } = setup();
		repository.findPageByPermalink.mockResolvedValue(null);
		repository.createPage.mockImplementation(async (input) => ({ id: PAGE_ID, ...input }));

		const page = await service.createPage(
			TEST_USER_ID,
			{ title: 'Sobre', permalink: '/sobre', status: 'published', published_at: null, seo: null },
			context,
		);

		expect(page).toMatchObject({ id: PAGE_ID, permalink: '/sobre', published_at: now.toISOString() });
		expect(repository.recordAudit).toHaveBeenCalledWith(
			expect.objectContaining({ action: 'cms.page.create', resourceType: 'page', resourceId: PAGE_ID }),
		);
	});

	it('refuses a permalink that another page already uses', async () => {
		const { repository, service } = setup();
		repository.findPageByPermalink.mockResolvedValue({ id: 'other' });

		await expectApiError(
			service.createPage(TEST_USER_ID, { title: 'Sobre', permalink: '/sobre', status: 'draft', published_at: null }, context),
			409,
			'PERMALINK_IN_USE',
		);
		expect(repository.createPage).not.toHaveBeenCalled();
	});

	it('lets a page keep its own permalink on update and reports a missing page', async () => {
		const { repository, service } = setup();
		repository.findPageByPermalink.mockResolvedValue({ id: PAGE_ID });
		repository.updatePage.mockResolvedValue({ before: { id: PAGE_ID, title: 'Old' }, data: { id: PAGE_ID, title: 'Sobre' } });

		await expect(
			service.updatePage(TEST_USER_ID, PAGE_ID, { title: 'Sobre', permalink: '/sobre', status: 'draft', published_at: null }, context),
		).resolves.toMatchObject({ title: 'Sobre' });

		repository.updatePage.mockResolvedValue(null);
		await expectApiError(
			service.updatePage(TEST_USER_ID, PAGE_ID, { title: 'x', permalink: '/sobre', status: 'draft', published_at: null }, context),
			404,
			'PAGE_NOT_FOUND',
		);
	});

	it('never deletes the home page because the site would lose its entry point', async () => {
		const { repository, service } = setup();
		repository.getPage.mockResolvedValue({ id: PAGE_ID, permalink: '/', blocks: [] });

		await expectApiError(service.deletePage(TEST_USER_ID, PAGE_ID, context), 409, 'HOME_PAGE_PROTECTED');
		expect(repository.deletePage).not.toHaveBeenCalled();
	});

	it('issues a preview link bound to the page permalink', async () => {
		const { repository, service } = setup();
		repository.getPage.mockResolvedValue({ id: PAGE_ID, permalink: '/sobre', blocks: [] });

		const preview = await service.createPreview(PAGE_ID);

		expect(preview.url).toMatch(/^http:\/\/localhost:3003\/sobre\?preview=/);
		expect(verifyPreviewToken('test-cookie-secret-value', preview.token, '/sobre', now)).toBe(true);
		expect(preview.expiresAt).toBe('2026-09-05T13:00:00.000Z');
	});
});

describe('CmsService blocks', () => {
	it('sanitizes rich text before storing a new block and appends it after the existing ones', async () => {
		const { repository, service } = setup();
		repository.getPage.mockResolvedValue({ id: PAGE_ID, permalink: '/sobre', blocks: [] });
		repository.listBlockIds.mockResolvedValue(['a', 'b']);
		repository.createBlock.mockImplementation(async (_pageId, block) => ({ id: BLOCK_ID, ...block }));

		const block = await service.addBlock(
			TEST_USER_ID,
			PAGE_ID,
			{
				collection: 'block_richtext',
				item: { content: '<p>oi</p><script>alert(1)</script>', alignment: 'left' },
				background: 'light',
				hide_block: false,
			},
			context,
		);

		expect(block).toMatchObject({ sort: 3, item: { content: '<p>oi</p>' } });
	});

	it('validates a block update against the schema of its own collection', async () => {
		const { repository, service } = setup();
		repository.getBlock.mockResolvedValue({
			id: BLOCK_ID,
			collection: 'block_hero',
			item: { id: ITEM_ID, headline: 'Antes', layout: 'image_right', buttons: [] },
		});
		repository.updateBlock.mockImplementation(async (_page, _block, patch) => ({ id: BLOCK_ID, ...patch }));

		await expectApiError(
			service.updateBlock(TEST_USER_ID, PAGE_ID, BLOCK_ID, { item: { headline: '' } }, context),
			422,
			'VALIDATION_ERROR',
		);

		const updated = await service.updateBlock(
			TEST_USER_ID,
			PAGE_ID,
			BLOCK_ID,
			{ item: { headline: 'Depois' }, hide_block: true },
			context,
		);
		expect(updated).toMatchObject({ hide_block: true, item: expect.objectContaining({ headline: 'Depois', layout: 'image_right' }) });
	});

	it('only reorders when the new order names exactly the blocks of the page', async () => {
		const { repository, service } = setup();
		repository.listBlockIds.mockResolvedValue(['a', 'b', 'c']);
		repository.setBlockOrder.mockResolvedValue(undefined);

		await expectApiError(service.reorderBlocks(TEST_USER_ID, PAGE_ID, ['a', 'b'], context), 422, 'INVALID_BLOCK_ORDER');
		await expectApiError(service.reorderBlocks(TEST_USER_ID, PAGE_ID, ['a', 'b', 'x'], context), 422, 'INVALID_BLOCK_ORDER');

		await service.reorderBlocks(TEST_USER_ID, PAGE_ID, ['c', 'a', 'b'], context);
		expect(repository.setBlockOrder).toHaveBeenCalledWith(PAGE_ID, ['c', 'a', 'b']);
	});
});

describe('CmsService navigation', () => {
	it('keeps the header and footer menus the layout depends on', async () => {
		const { repository, service } = setup();

		await expectApiError(service.deleteNavigation(TEST_USER_ID, 'main', context), 409, 'NAVIGATION_PROTECTED');
		await expectApiError(service.deleteNavigation(TEST_USER_ID, 'footer', context), 409, 'NAVIGATION_PROTECTED');
		expect(repository.deleteNavigation).not.toHaveBeenCalled();
	});

	it('requires a parent item from the same menu and forbids an item to be its own parent', async () => {
		const { repository, service } = setup();
		repository.getNavigation.mockResolvedValue({ id: 'main', items: [] });
		repository.getNavigationItem.mockResolvedValue(null);

		await expectApiError(
			service.createNavigationItem(TEST_USER_ID, 'main', { title: 'x', type: 'url', url: '/x', parent: ITEM_ID }, context),
			422,
			'INVALID_PARENT',
		);

		await expectApiError(
			service.updateNavigationItem(TEST_USER_ID, 'main', ITEM_ID, { title: 'x', type: 'url', url: '/x', parent: ITEM_ID }, context),
			422,
			'INVALID_PARENT',
		);
	});
});

describe('CmsService posts and redirects', () => {
	it('sanitizes the post body and refuses a slug already taken', async () => {
		const { repository, service } = setup();
		repository.findPostBySlug.mockResolvedValue(null);
		repository.createPost.mockImplementation(async (input) => ({ id: 'post', ...input }));

		const post = await service.createPost(
			TEST_USER_ID,
			{ title: 'Oi', slug: 'oi', content: '<p>ok</p><img src="javascript:x">', status: 'draft', published_at: null },
			context,
		);
		expect(post).toMatchObject({ content: '<p>ok</p>', name: 'Oi' });

		repository.findPostBySlug.mockResolvedValue({ id: 'other' });
		await expectApiError(
			service.createPost(TEST_USER_ID, { title: 'Oi', slug: 'oi', status: 'draft', published_at: null }, context),
			409,
			'SLUG_IN_USE',
		);
	});

	it('refuses duplicated sources and redirects that would loop', async () => {
		const { repository, service } = setup();
		repository.findRedirectByFrom.mockImplementation(async (from: string) =>
			from === '/a' ? { id: 'r1', url_from: '/a', url_to: '/b' } : null,
		);

		await expectApiError(
			service.createRedirect(TEST_USER_ID, { url_from: '/a', url_to: '/c', response_code: '301' }, context),
			409,
			'REDIRECT_IN_USE',
		);
		await expectApiError(
			service.createRedirect(TEST_USER_ID, { url_from: '/b', url_to: '/a', response_code: '301' }, context),
			422,
			'REDIRECT_LOOP',
		);
	});
});

describe('CmsService forms, media and settings', () => {
	it('stores the form with its fields in order and audits it', async () => {
		const { repository, service } = setup();
		repository.createForm.mockImplementation(async (input, fields) => ({ id: 'f1', ...input, fields }));

		const form = await service.createForm(
			TEST_USER_ID,
			{
				title: 'Contato',
				on_success: 'message',
				is_active: true,
				fields: [
					{ name: 'nome', type: 'text', label: 'Nome', width: '100', required: true },
					{ name: 'email', type: 'text', label: 'E-mail', width: '100', required: true },
				],
			},
			context,
		);

		expect(form.fields).toEqual([
			expect.objectContaining({ name: 'nome', sort: 1 }),
			expect.objectContaining({ name: 'email', sort: 2 }),
		]);
		expect(repository.recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'cms.form.create' }));
	});

	it('reports a missing media file and audits a deletion', async () => {
		const { repository, service } = setup();
		repository.deleteMedia.mockResolvedValue(null);
		await expectApiError(service.deleteMedia(TEST_USER_ID, ITEM_ID, context), 404, 'MEDIA_NOT_FOUND');

		repository.deleteMedia.mockResolvedValue({ id: ITEM_ID, path: 'x.png' });
		await service.deleteMedia(TEST_USER_ID, ITEM_ID, context);
		expect(repository.recordAudit).toHaveBeenCalledWith(
			expect.objectContaining({ action: 'cms.media.delete', resourceId: ITEM_ID }),
		);
	});

	it('updates the site identity through the repository and records before/after', async () => {
		const { repository, service } = setup();
		repository.updateSiteSettings.mockResolvedValue({ before: { title: 'A' }, data: { id: 's', title: 'B' } });

		await expect(service.updateSiteSettings(TEST_USER_ID, { title: 'B' }, context)).resolves.toMatchObject({ title: 'B' });
		expect(repository.recordAudit).toHaveBeenCalledWith(
			expect.objectContaining({ action: 'cms.site.update', before: { title: 'A' }, after: { id: 's', title: 'B' } }),
		);
	});
});
