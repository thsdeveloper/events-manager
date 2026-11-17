import { expect, it, vi } from 'vitest';
import { revalidateTag, revalidatePath } from 'next/cache';
import { revalidateEventPage } from './actions';
import { eventCacheTag, CMS_CONTENT_CACHE_TAG } from '@/lib/content/fetchers';
vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
it('invalidates the event, catalogue and sitemap together after publication changes', async () => {
	await revalidateEventPage('meu-evento');
	expect(revalidateTag).toHaveBeenCalledWith(eventCacheTag('meu-evento'));
	expect(revalidateTag).toHaveBeenCalledWith(CMS_CONTENT_CACHE_TAG);
	expect(revalidatePath).toHaveBeenCalledWith('/eventos');
	expect(revalidatePath).toHaveBeenCalledWith('/sitemap.xml');
});
