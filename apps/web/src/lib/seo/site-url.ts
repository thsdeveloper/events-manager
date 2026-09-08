import type { Globals, MediaFile } from '@events-manager/contracts';
import { getMediaAssetUrl } from '@/lib/media';

const LOCAL_SITE_URL = 'http://localhost:3003';

/**
 * Origem pública do site, sem barra final: a URL cadastrada no CMS vence a
 * variável de ambiente, que vence o endereço de desenvolvimento.
 */
export function resolveSiteUrl(globals?: Partial<Pick<Globals, 'id' | 'url'>> | null): string {
	const candidate = globals?.url?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim() || LOCAL_SITE_URL;

	return candidate.replace(/\/+$/, '');
}

export function absoluteUrl(siteUrl: string, pathOrUrl: string | null | undefined): string | undefined {
	if (!pathOrUrl) return undefined;
	if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

	return `${siteUrl}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

/** URL absoluta de uma mídia do CMS (id, objeto ou URL já pronta). */
export function absoluteMediaUrl(siteUrl: string, media: string | MediaFile | null | undefined): string | undefined {
	return absoluteUrl(siteUrl, getMediaAssetUrl(media));
}
