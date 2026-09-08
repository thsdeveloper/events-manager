'use server';

import { revalidateTag } from 'next/cache';
import { CMS_CONTENT_CACHE_TAG, SITE_DATA_CACHE_TAG } from '@/lib/content/fetchers';

/**
 * O site público lê páginas, posts, menus e redirecionamentos de respostas
 * cacheadas. Depois de qualquer mutação no painel, derrubamos as duas tags para
 * que a edição apareça sem esperar a janela de revalidação.
 */
export async function revalidateCmsContent() {
	revalidateTag(CMS_CONTENT_CACHE_TAG);
	revalidateTag(SITE_DATA_CACHE_TAG);
}
