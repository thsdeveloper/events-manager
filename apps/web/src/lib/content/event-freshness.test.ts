import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchEventBySlug, fetchSiteData } from './fetchers';
import EventsPage from '@/app/(public)/eventos/page';
import { BackendError } from '@/lib/backend';

afterEach(() => vi.unstubAllGlobals());

describe('fresh public event data', () => {
	it('requests current prices and event data on every visit, without the shared 30-second cache', async () => {
		const fetch = vi
			.fn()
			.mockResolvedValueOnce(Response.json({ title: 'Congresso', tickets: [{ price: 50 }] }))
			.mockResolvedValueOnce(Response.json({ title: 'Congresso atualizado', tickets: [{ price: 75 }] }));
		vi.stubGlobal('fetch', fetch);
		await expect(fetchEventBySlug('congresso')).resolves.toMatchObject({ tickets: [{ price: 50 }] });
		await expect(fetchEventBySlug('congresso')).resolves.toMatchObject({
			title: 'Congresso atualizado',
			tickets: [{ price: 75 }],
		});
		expect(fetch).toHaveBeenCalledTimes(2);
		for (const [, init] of fetch.mock.calls) {
			expect(init).toMatchObject({ cache: 'no-store', next: { revalidate: 0 } });
		}
	});

	it('does not reuse a previously published event after the API says it is no longer available', async () => {
		const fetch = vi
			.fn()
			.mockResolvedValueOnce(Response.json({ title: 'Congresso' }))
			.mockResolvedValueOnce(
				Response.json({ title: 'EVENT_NOT_FOUND', detail: 'Evento não encontrado.' }, { status: 404 }),
			);
		vi.stubGlobal('fetch', fetch);
		await fetchEventBySlug('congresso');
		await expect(fetchEventBySlug('congresso')).rejects.toBeInstanceOf(BackendError);
		expect(fetch.mock.calls[1][1]).toMatchObject({ cache: 'no-store', next: { revalidate: 0 } });
	});

	it('also refreshes the public catalogue while preserving search and pagination', async () => {
		const fetch = vi
			.fn()
			.mockResolvedValue(Response.json({ data: [], pagination: { page: 2, pageCount: 2, total: 20, limit: 12 } }));
		vi.stubGlobal('fetch', fetch);
		await EventsPage({ searchParams: Promise.resolve({ page: '2', search: 'congresso' }) });
		expect(fetch).toHaveBeenCalledWith(
			expect.stringContaining('/api/events/public?page=2&limit=12&search=congresso'),
			expect.objectContaining({ cache: 'no-store', next: { revalidate: 0 } }),
		);
	});

	it('keeps the institutional identity cache separate from ticket availability and prices', async () => {
		const fetch = vi.fn().mockResolvedValue(Response.json({ globals: { title: 'Flouvi' } }));
		vi.stubGlobal('fetch', fetch);
		await fetchSiteData();
		expect(fetch.mock.calls[0][1]).toMatchObject({ next: { revalidate: 30, tags: ['site-settings'] } });
	});
});
