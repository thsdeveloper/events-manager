import { describe, expect, it } from 'vitest';
import { toSearchResults } from './search-results';

describe('toSearchResults', () => {
	it('maps every API collection to an internal navigable result', () => {
		expect(
			toSearchResults({
				pages: [{ id: '1', title: 'Agenda', permalink: '//agenda/' }],
				posts: [{ id: '2', title: 'Novidade', slug: 'novidade', description: null }],
				events: [{ id: '3', title: 'Festival', slug: 'festival', short_description: 'Ao vivo' }],
			}),
		).toEqual([
			{ id: 'page:1', title: 'Agenda', description: '', type: 'Página', link: '/agenda' },
			{ id: 'post:2', title: 'Novidade', description: '', type: 'Artigo', link: '/blog/novidade' },
			{ id: 'event:3', title: 'Festival', description: 'Ao vivo', type: 'Evento', link: '/eventos/festival' },
		]);
	});
});
