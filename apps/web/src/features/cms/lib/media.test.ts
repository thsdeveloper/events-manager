import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch } from '@/test';
import { formatFileSize, isImageMedia, mediaLabel, mediaUrl, uploadCmsFile, validateUploadFile } from './media';

afterEach(() => vi.unstubAllGlobals());

describe('media helpers', () => {
	it('tells images from documents and formats sizes for people', () => {
		expect(isImageMedia({ type: 'image/webp' })).toBe(true);
		expect(isImageMedia({ type: 'application/pdf' })).toBe(false);
		expect(isImageMedia(null)).toBe(false);
		expect(formatFileSize(null)).toBe('—');
		expect(formatFileSize(512)).toBe('512 B');
		expect(formatFileSize(20 * 1024)).toBe('20 KB');
		expect(formatFileSize(3.5 * 1024 * 1024)).toBe('3.5 MB');
	});

	it('labels a file by title, then filename, then id, and resolves its public URL', () => {
		expect(mediaLabel({ id: 'x', title: 'Capa', filename: 'capa.png' })).toBe('Capa');
		expect(mediaLabel({ id: 'x', title: null, filename: 'capa.png' })).toBe('capa.png');
		expect(mediaLabel({ id: 'x', title: null, filename: null })).toBe('x');
		expect(mediaUrl(null)).toBe('');
		expect(mediaUrl({ id: 'x', bucket: 'media', path: 'cms/a.png' })).toContain(
			'/storage/v1/object/public/media/cms/a.png',
		);
	});

	it('accepts PDFs only when documents are allowed', () => {
		const pdf = new File(['%PDF'], 'doc.pdf', { type: 'application/pdf' });

		expect(validateUploadFile(pdf)).toMatch(/PNG, JPEG, WebP ou GIF/);
		expect(validateUploadFile(pdf, { imagesOnly: false })).toBeNull();
	});

	it('surfaces the API detail when the upload is refused', async () => {
		mockFetch([['/api/upload?folder=cms', () => jsonResponse({ detail: 'Arquivo corrompido.' }, { status: 400 })]]);

		await expect(uploadCmsFile(new File(['x'], 'a.png', { type: 'image/png' }))).rejects.toThrow('Arquivo corrompido.');
	});
});
