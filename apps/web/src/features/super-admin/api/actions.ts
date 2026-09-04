'use server';

import { revalidateTag } from 'next/cache';
import { SITE_DATA_CACHE_TAG } from '@/lib/content/fetchers';

/**
 * The header, footer and auth screens all read the logos from the cached
 * `/api/content/site` response. Saving new branding has to drop that cache or
 * the change would only surface on the next revalidation window.
 */
export async function revalidateSiteBranding() {
  revalidateTag(SITE_DATA_CACHE_TAG);
}
