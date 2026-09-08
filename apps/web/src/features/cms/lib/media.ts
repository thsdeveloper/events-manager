import { getMediaAssetUrl } from '@/lib/media';
import type { CmsMedia } from '../types';

export const CMS_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;
export const CMS_UPLOAD_TYPES = [...CMS_IMAGE_TYPES, 'application/pdf'] as const;
export const CMS_MAX_FILE_SIZE = 20 * 1024 * 1024;

export function isImageMedia(media: Pick<CmsMedia, 'type'> | null | undefined) {
	return Boolean(media?.type && media.type.startsWith('image/'));
}

export function mediaUrl(media: CmsMedia | null | undefined) {
	return media
		? getMediaAssetUrl({ id: media.id, bucket: media.bucket ?? undefined, path: media.path ?? undefined })
		: '';
}

export function mediaLabel(media: Pick<CmsMedia, 'title' | 'filename' | 'id'>) {
	return media.title || media.filename || media.id;
}

export function formatFileSize(bytes: number | null | undefined) {
	if (!bytes) return '—';
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;

	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Valida tipo e tamanho antes do upload; devolve a mensagem de erro ou `null`. */
export function validateUploadFile(file: File, { imagesOnly = true } = {}) {
	const accepted: readonly string[] = imagesOnly ? CMS_IMAGE_TYPES : CMS_UPLOAD_TYPES;
	if (!accepted.includes(file.type)) {
		return imagesOnly
			? 'Envie uma imagem PNG, JPEG, WebP ou GIF.'
			: 'Envie uma imagem (PNG, JPEG, WebP ou GIF) ou um PDF.';
	}
	if (file.size > CMS_MAX_FILE_SIZE) return 'O arquivo deve ter no máximo 20 MB.';

	return null;
}

export async function uploadCmsFile(file: File): Promise<CmsMedia> {
	const formData = new FormData();
	formData.append('file', file);
	const response = await fetch('/api/upload?folder=cms', { method: 'POST', body: formData, credentials: 'include' });
	const body = await response.json().catch(() => null);
	if (!response.ok) throw new Error(body?.detail ?? 'Não foi possível enviar o arquivo.');

	return (body.file ?? { id: body.fileId, filename: body.filename }) as CmsMedia;
}
