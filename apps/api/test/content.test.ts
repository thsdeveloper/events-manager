import { describe, expect, it, vi } from 'vitest';
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
	};
}

describe('ContentService', () => {
	it('loads public site data through its application port', async () => {
		const contentRepository = repository();
		const service = new ContentService(contentRepository);

		await expect(service.getSite()).resolves.toEqual({ globals: { id: 'site' } });
		expect(contentRepository.getSite).toHaveBeenCalledOnce();
	});

	it('passes pagination and identifiers to the repository unchanged', async () => {
		const contentRepository = repository();
		const service = new ContentService(contentRepository);

		await Promise.all([
			service.getPage('/agenda', 3),
			service.getPost('novidades'),
			service.listPosts(12, 2),
			service.getRedirects(),
			service.search('evento'),
		]);

		expect(contentRepository.getPage).toHaveBeenCalledWith('/agenda', 3);
		expect(contentRepository.getPost).toHaveBeenCalledWith('novidades');
		expect(contentRepository.listPosts).toHaveBeenCalledWith(12, 2);
		expect(contentRepository.getRedirects).toHaveBeenCalledOnce();
		expect(contentRepository.search).toHaveBeenCalledWith('evento');
	});

	it('does not query the repository for undersized searches', async () => {
		const contentRepository = repository();
		const service = new ContentService(contentRepository);

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
