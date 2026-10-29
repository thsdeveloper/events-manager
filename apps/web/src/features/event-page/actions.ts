'use server';

import { revalidateTag } from 'next/cache';
import { eventCacheTag } from '@/lib/content/fetchers';

/**
 * Publicar ou despublicar a landing page precisa aparecer na hora: a página
 * pública do evento fica em cache por alguns segundos, e esta ação derruba só
 * a tag daquele evento.
 */
export async function revalidateEventPage(slug: string) {
	revalidateTag(eventCacheTag(slug));
}
