'use server';

import { revalidateTag, revalidatePath } from 'next/cache';
import { eventCacheTag, CMS_CONTENT_CACHE_TAG } from '@/lib/content/fetchers';

/**
 * Publicar ou despublicar a landing page precisa aparecer na hora: a página
 * pública do evento, o catálogo e o sitemap dependem dos mesmos dados; por isso
 * a ação invalida os caches do evento e do conteúdo público.
 */
export async function revalidateEventPage(slug: string) {
	revalidateTag(eventCacheTag(slug));
	revalidateTag(CMS_CONTENT_CACHE_TAG);
	revalidatePath(`/eventos/${slug}`);
	revalidatePath(`/eventos/${slug}/checkout`);
	revalidatePath('/eventos');
	revalidatePath('/sitemap.xml');
}
