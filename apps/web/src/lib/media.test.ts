/**
 * Como a mídia chega ao navegador.
 *
 * `/api/media/:id` responde 302 para o storage público. O navegador segue esse
 * redirecionamento numa `<img>` comum, mas o otimizador do `next/image` não
 * segue redirecionamento para outra origem: ele responde 400 ("Unable to
 * optimize image and unable to fallback to upstream image") e a imagem some da
 * tela. Por isso, sempre que o payload traz o arquivo completo, a URL montada
 * precisa apontar direto para o storage.
 */
import { describe, expect, it } from 'vitest';
import type { MediaFile } from '@events-manager/contracts';
import { getMediaAssetUrl } from './media';

const file = {
	id: '911152a8-90df-41b4-b457-d2e3211f60de',
	bucket: 'media',
	path: 'organizador/eventos/capa.png',
} as MediaFile;

describe('getMediaAssetUrl', () => {
	it('serves a stored file straight from the public storage URL', () => {
		expect(getMediaAssetUrl(file)).toBe('http://127.0.0.1:55321/storage/v1/object/public/media/organizador/eventos/capa.png');
	});

	it('falls back to the redirecting API route when only the id is known', () => {
		expect(getMediaAssetUrl(file.id)).toBe(`/api/media/${file.id}`);
	});

	it('keeps an absolute URL untouched', () => {
		expect(getMediaAssetUrl('https://cdn.test/capa.png')).toBe('https://cdn.test/capa.png');
	});

	it('renders nothing when there is no media', () => {
		expect(getMediaAssetUrl(null)).toBe('');
	});
});
