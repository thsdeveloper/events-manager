import { describe, expect, it } from 'vitest';
import { SupabaseEventRepository } from '../src/infrastructure/supabase/event-repository.js';
import { SupabaseContentRepository } from '../src/infrastructure/supabase/content-repository.js';
import type { SupabaseClients } from '../src/infrastructure/supabase/clients.js';

const events = [
	{
		id: 'listed',
		title: 'Público',
		slug: 'publico',
		status: 'published',
		visibility: 'public',
		start_date: '2099-01-01',
		end_date: '2099-01-02',
	},
	{
		id: 'link',
		title: 'Encontro',
		slug: 'encontro',
		status: 'published',
		visibility: 'unlisted',
		start_date: '2099-01-01',
		end_date: '2099-01-02',
	},
	{
		id: 'draft',
		title: 'Rascunho',
		slug: 'rascunho',
		status: 'draft',
		visibility: 'public',
		start_date: '2099-01-01',
		end_date: '2099-01-02',
	},
];

/** In-memory database port: queries really filter rows, so tests observe which events escape. */
function database() {
	const tables: Record<string, Array<Record<string, unknown>>> = {
		events,
		pages: [{ id: 'home', permalink: '/', status: 'published' }],
		posts: [],
		page_blocks: [{ page: 'home', collection: 'block_events', item: 'feed', hide_block: false }],
		block_events: [{ id: 'feed', max_items: 10 }],
	};
	return {
		from(table: string) {
			let rows = [...(tables[table] ?? [])];
			const result = () => ({ data: rows, error: null, count: rows.length });
			const builder = {
				select() {
					return builder;
				},
				eq(key: string, value: unknown) {
					if (!key.includes('.')) rows = rows.filter((row) => row[key] === value);
					return builder;
				},
				gte() {
					return builder;
				},
				ilike() {
					return builder;
				},
				or() {
					return builder;
				},
				order() {
					return builder;
				},
				limit() {
					return builder;
				},
				range() {
					return builder;
				},
				maybeSingle() {
					return Promise.resolve({ data: rows[0] ?? null, error: null });
				},
				then(resolve: (value: ReturnType<typeof result>) => unknown) {
					return Promise.resolve(result()).then(resolve);
				},
			};
			return builder;
		},
	} as unknown as SupabaseClients['admin'];
}

describe('unlisted events', () => {
	it('leaves unlisted events out of the public catalog', async () => {
		const repo = new SupabaseEventRepository({ admin: database() } as SupabaseClients);
		expect((await repo.listPublic({ limit: 12, page: 1, search: '' })).data).toEqual([events[0]]);
	});
	it('allows the direct link while still rejecting draft links', async () => {
		const repo = new SupabaseEventRepository({ admin: database() } as SupabaseClients);
		expect(await repo.findPublicBySlug('encontro')).toMatchObject({ id: 'link', visibility: 'unlisted' });
		expect(await repo.findPublicBySlug('rascunho')).toBeNull();
	});
	it('omits unlisted events from search and sitemap', async () => {
		const repo = new SupabaseContentRepository(database());
		expect((await repo.search('')).events).toEqual([events[0]]);
		expect((await repo.getSitemap()).events).toEqual([events[0]]);
	});
	it('omits unlisted events from CMS event blocks', async () => {
		const page = await new SupabaseContentRepository(database()).getPage('/', 1, {
			includeDrafts: false,
			now: '2026-10-29T12:00:00Z',
		});
		expect(page.blocks[0].item).toMatchObject({ events: [events[0]] });
	});
});
