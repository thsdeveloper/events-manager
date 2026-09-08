import { describe, expect, it, vi } from 'vitest';

const revalidateTag = vi.hoisted(() => vi.fn());
vi.mock('next/cache', () => ({ revalidateTag }));

import { revalidateCmsContent } from './actions';

describe('revalidateCmsContent', () => {
	it('drops both the content and the site-settings caches so the public site updates at once', async () => {
		await revalidateCmsContent();

		expect(revalidateTag).toHaveBeenCalledWith('cms-content');
		expect(revalidateTag).toHaveBeenCalledWith('site-settings');
	});
});
