import { describe, expect, it, vi } from 'vitest';
import { createPreviewToken } from '../src/application/cms/preview-token.js';
import { ContentService, type ContentRepository } from '../src/application/content/content-service.js';
import {
	InvalidFormSubmission,
	SubmitForm,
	type FormSubmissionRepository,
} from '../src/application/content/submit-form.js';

function repository(): ContentRepository {
	return {
		getPage: vi.fn().mockResolvedValue({ id: 'page' }),
		getPost: vi.fn().mockResolvedValue({ id: 'post' }),
		getRedirects: vi.fn().mockResolvedValue([]),
		getSite: vi.fn().mockResolvedValue({ globals: { id: 'site' } }),
		listPosts: vi.fn().mockResolvedValue({ data: [] }),
		search: vi.fn().mockResolvedValue({ pages: [], posts: [], events: [] }),
		getSitemap: vi.fn().mockResolvedValue({ pages: [], posts: [], events: [] }),
		getFees: vi.fn().mockResolvedValue({ platform_fee_percentage: 5 }),
	};
}

const now = new Date('2026-09-05T12:00:00.000Z');
const previewSecret = 'test-cookie-secret-value';

function serviceWith(contentRepository: ContentRepository) {
	return new ContentService(contentRepository, { previewSecret, now: () => now });
}

describe('ContentService pages and preview', () => {
	it('serves only published, already scheduled pages to the public', async () => {
		const contentRepository = repository();
		const service = serviceWith(contentRepository);

		await service.getPage('/sobre', 1);

		expect(contentRepository.getPage).toHaveBeenCalledWith('/sobre', 1, { includeDrafts: false, now: now.toISOString() });
	});

	it('opens a draft when the preview token matches the permalink and is still valid', async () => {
		const contentRepository = repository();
		const service = serviceWith(contentRepository);
		const { token } = createPreviewToken(previewSecret, '/sobre', now);

		await service.getPage('/sobre', 1, token);
		expect(contentRepository.getPage).toHaveBeenLastCalledWith('/sobre', 1, { includeDrafts: true, now: now.toISOString() });

		await service.getPage('/contato', 1, token);
		expect(contentRepository.getPage).toHaveBeenLastCalledWith('/contato', 1, {
			includeDrafts: false,
			now: now.toISOString(),
		});
	});

	it('sanitizes rich text blocks and post bodies on the way out as defense in depth', async () => {
		const contentRepository = repository();
		vi.mocked(contentRepository.getPage).mockResolvedValue({
			id: 'page',
			title: 'x',
			permalink: '/x',
			blocks: [
				{ id: 'b1', collection: 'block_richtext', item: { id: 'i1', content: '<p>ok</p><script>x()</script>' } },
				{ id: 'b2', collection: 'block_hero', item: { id: 'i2', headline: '<b>h</b>' } },
			],
		} as never);
		vi.mocked(contentRepository.getPost).mockResolvedValue({
			post: { id: 'p', title: 't', name: 't', content: '<p>oi</p><iframe src="x"></iframe>' },
			relatedPosts: [],
		});
		const service = serviceWith(contentRepository);

		const page = await service.getPage('/x', 1);
		expect(page.blocks).toEqual([
			expect.objectContaining({ item: expect.objectContaining({ content: '<p>ok</p>' }) }),
			expect.objectContaining({ item: expect.objectContaining({ headline: '<b>h</b>' }) }),
		]);

		const { post } = await service.getPost('t');
		expect(post?.content).toBe('<p>oi</p>');
	});
});

describe('ContentService sitemap', () => {
	it('omits pages marked noindex or scheduled for the future and forwards sitemap hints', async () => {
		const contentRepository = repository();
		vi.mocked(contentRepository.getSitemap).mockResolvedValue({
			pages: [
				{ permalink: '/', published_at: '2026-01-01T00:00:00.000Z', date_updated: '2026-02-01T00:00:00.000Z', seo: null },
				{
					permalink: '/oculta',
					published_at: '2026-01-01T00:00:00.000Z',
					date_updated: '2026-02-01T00:00:00.000Z',
					seo: { no_index: true },
				},
				{ permalink: '/futura', published_at: '2027-01-01T00:00:00.000Z', date_updated: '2026-02-01T00:00:00.000Z', seo: null },
				{
					permalink: '/sobre',
					published_at: null,
					date_updated: '2026-02-01T00:00:00.000Z',
					seo: { sitemap: { change_frequency: 'monthly', priority: 0.6 } },
				},
			],
			posts: [
				{ slug: 'a', published_at: '2026-01-01T00:00:00.000Z', date_updated: '2026-02-01T00:00:00.000Z', seo: null },
				{ slug: 'b', published_at: '2026-01-01T00:00:00.000Z', date_updated: '2026-02-01T00:00:00.000Z', seo: { no_index: true } },
			],
			events: [],
		});
		const service = serviceWith(contentRepository);

		const sitemap = await service.getSitemap();

		expect(sitemap.pages.map((page) => page.permalink)).toEqual(['/', '/sobre']);
		expect(sitemap.pages[1]).toMatchObject({ change_frequency: 'monthly', priority: 0.6 });
		expect(sitemap.posts.map((post) => post.slug)).toEqual(['a']);
	});
});

describe('ContentService', () => {
	it('loads public site data through its application port', async () => {
		const contentRepository = repository();
		const service = serviceWith(contentRepository);

		await expect(service.getSite()).resolves.toEqual({ globals: { id: 'site' } });
		expect(contentRepository.getSite).toHaveBeenCalledOnce();
	});

	it('passes pagination and identifiers to the repository unchanged', async () => {
		const contentRepository = repository();
		const service = serviceWith(contentRepository);

		await Promise.all([
			service.getPage('/agenda', 3),
			service.getPost('novidades'),
			service.listPosts(12, 2),
			service.getRedirects(),
			service.search('evento'),
		]);

		expect(contentRepository.getPage).toHaveBeenCalledWith('/agenda', 3, expect.objectContaining({ includeDrafts: false }));
		expect(contentRepository.getPost).toHaveBeenCalledWith('novidades');
		expect(contentRepository.listPosts).toHaveBeenCalledWith(12, 2);
		expect(contentRepository.getRedirects).toHaveBeenCalledOnce();
		expect(contentRepository.search).toHaveBeenCalledWith('evento');
	});

	it('exposes the public fee table through the same port', async () => {
		const contentRepository = repository();

		await expect(serviceWith(contentRepository).getFees()).resolves.toEqual({ platform_fee_percentage: 5 });
	});

	it('does not query the repository for undersized searches', async () => {
		const contentRepository = repository();
		const service = serviceWith(contentRepository);

		await expect(service.search('a')).resolves.toEqual({ pages: [], posts: [], events: [] });
		expect(contentRepository.search).not.toHaveBeenCalled();
	});
});

function formRepository(): FormSubmissionRepository {
	return {
		create: vi.fn().mockResolvedValue('submission-1'),
		filesBelongToUser: vi.fn().mockResolvedValue(true),
		getDefinition: vi.fn().mockResolvedValue({
			active: true,
			fields: [
				{ id: 'name', type: 'text', required: true, validation: 'min:2|max:100', choices: null },
				{ id: 'kind', type: 'select', required: false, validation: null, choices: [{ value: 'event' }] },
				{ id: 'attachment', type: 'file', required: false, validation: null, choices: null },
			],
		}),
	};
}

describe('SubmitForm', () => {
	it('validates fields and delegates the atomic persistence to its repository', async () => {
		const repository = formRepository();
		const values = [
			{ field: 'name', value: 'Ana' },
			{ field: 'kind', value: 'event' },
		];

		await expect(new SubmitForm(repository).execute('form-1', 'user-1', values)).resolves.toBe('submission-1');
		expect(repository.create).toHaveBeenCalledWith('form-1', 'user-1', values);
	});

	it.each([
		{ name: 'missing required field', values: [] },
		{ name: 'unknown field', values: [{ field: 'other', value: 'text' }] },
		{
			name: 'invalid choice',
			values: [
				{ field: 'name', value: 'Ana' },
				{ field: 'kind', value: 'unknown' },
			],
		},
		{ name: 'wrong value type', values: [{ field: 'name', file: 'file-1' }] },
	])('rejects $name', async ({ values }) => {
		await expect(new SubmitForm(formRepository()).execute('form-1', 'user-1', values)).rejects.toBeInstanceOf(
			InvalidFormSubmission,
		);
	});

	it('rejects files not owned by the authenticated submitter', async () => {
		const repository = formRepository();
		vi.mocked(repository.filesBelongToUser).mockResolvedValue(false);

		await expect(
			new SubmitForm(repository).execute('form-1', 'user-1', [
				{ field: 'name', value: 'Ana' },
				{ field: 'attachment', file: 'file-1' },
			]),
		).rejects.toBeInstanceOf(InvalidFormSubmission);
	});
});
