import { describe, expect, it, vi } from 'vitest';
import { fetchEventBySlug } from '@/lib/content/fetchers';
import { generateMetadata } from './page';
vi.mock('@/lib/content/fetchers', () => ({ fetchEventBySlug: vi.fn(), fetchSiteData: vi.fn() }));
describe('event search indexing', () => {
	it('asks search engines not to index an unlisted event', async () => {
		vi.mocked(fetchEventBySlug).mockResolvedValue({ title: 'Encontro', visibility: 'unlisted' } as never);
		expect(await generateMetadata({ params: Promise.resolve({ slug: 'encontro' }) })).toMatchObject({
			robots: { index: false, follow: false },
		});
	});
	it('keeps public events indexable', async () => {
		vi.mocked(fetchEventBySlug).mockResolvedValue({ title: 'Congresso', visibility: 'public' } as never);
		expect((await generateMetadata({ params: Promise.resolve({ slug: 'congresso' }) })).robots).toBeUndefined();
	});
});
