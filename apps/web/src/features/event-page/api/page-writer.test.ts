import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildDefaultEventPageLayout, type EventPageRecord } from '@events-manager/contracts';
import { createPageWriter } from './page-writer';
const draft = buildDefaultEventPageLayout({ title: 'Encontro' });
const initial: EventPageRecord = {
	event_id: 'event',
	draft,
	published: null,
	enabled: false,
	published_at: null,
	date_updated: '',
};
afterEach(() => vi.unstubAllGlobals());
function network() {
	let stored = structuredClone(initial);
	const fetch = vi.fn(async (url: string, init?: RequestInit) => {
		if (init?.method === 'PUT')
			stored = { ...stored, draft: JSON.parse(String(init.body)).draft, date_updated: '2026-11-19T19:00:00Z' };
		if (url.endsWith('/publish'))
			stored = { ...stored, enabled: true, published: stored.draft, published_at: '2026-11-19T19:01:00Z' };
		if (url.endsWith('/unpublish')) stored = { ...stored, enabled: false };

		return Response.json(stored);
	});
	vi.stubGlobal('fetch', fetch);

	return fetch;
}
describe('serialized event page persistence', () => {
	it('saves the exact snapshot before publishing and preserves the existing API format', async () => {
		const fetch = network();
		const writer = createPageWriter('event', initial);
		const changed = { ...draft, header: { ...draft.header, title: 'Título atualizado' } };
		const published = await writer.publish(changed);
		expect(published.published?.header.title).toBe('Título atualizado');
		expect(fetch.mock.calls.map(([url, init]) => [url, init?.method])).toEqual([
			['/api/events/event/page', 'PUT'],
			['/api/events/event/page/publish', 'POST'],
		]);
		expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({ draft: changed });
	});
	it('waits for an older autosave and publishes the newest snapshot instead of the pending one', async () => {
		const fetch = network();
		const original = fetch.getMockImplementation()!;
		let release!: () => void;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		fetch.mockImplementationOnce(async (url, init) => {
			await gate;

			return original(url, init);
		});
		const writer = createPageWriter('event', initial);
		const saving = writer.save(draft);
		const latest = { ...draft, header: { ...draft.header, title: 'Versão mais recente' } };
		const publishing = writer.publish(latest);
		release();
		await saving;
		expect((await publishing).published?.header.title).toBe('Versão mais recente');
	});
	it('does not publish after a failed save and allows a successful retry', async () => {
		const fetch = network();
		fetch.mockResolvedValueOnce(Response.json({ detail: 'Não foi possível salvar.' }, { status: 500 }));
		const writer = createPageWriter('event', initial);
		await expect(writer.publish(draft)).rejects.toThrow('Não foi possível salvar.');
		expect(fetch.mock.calls.some(([url]) => url.endsWith('/publish'))).toBe(false);
		expect((await writer.publish(draft)).enabled).toBe(true);
	});
	it('does not overwrite a draft when returning to the standard page', async () => {
		const fetch = network();
		const writer = createPageWriter('event', initial);
		await writer.save(draft);
		const result = await writer.unpublish();
		expect(result.enabled).toBe(false);
		expect(result.draft).toEqual(draft);
		expect(fetch.mock.calls.filter(([, init]) => init?.method === 'PUT')).toHaveLength(1);
	});
	it('does not send malformed content to the API', async () => {
		const fetch = network();
		const writer = createPageWriter('event', initial);
		await expect(
			writer.save({ ...draft, header: { ...draft.header, nav: [{ label: '', anchor: 'Invalid!' }] } }),
		).rejects.toThrow();
		expect(fetch).not.toHaveBeenCalled();
	});
	it('publica sem PUT extra quando o JSONB devolve as mesmas propriedades em outra ordem', async () => {
		const fetch = network();
		const reordered = {
			...draft,
			header: Object.fromEntries(Object.entries(draft.header).reverse()) as typeof draft.header,
		};
		const writer = createPageWriter('event', { ...initial, date_updated: '2026-11-19T12:00:00Z', draft: reordered });
		await writer.publish(draft);
		expect(fetch.mock.calls.map(([, init]) => init?.method)).toEqual(['POST']);
	});
	it('interrompe a publicação quando o proxy devolve uma falha sem JSON', async () => {
		const fetch = network();
		fetch.mockResolvedValueOnce(new Response('Bad gateway', { status: 502 }));
		await expect(createPageWriter('event', initial).publish(draft)).rejects.toThrow();
		expect(fetch.mock.calls.some(([url]) => url.endsWith('/publish'))).toBe(false);
	});
});
