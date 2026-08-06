export type SearchResult = {
	id: string;
	title: string;
	description: string;
	type: string;
	link: string;
};

export type SearchResponse = {
	pages: Array<{ id: string; title: string; permalink: string }>;
	posts: Array<{ id: string; title: string; slug: string; description: string | null }>;
	events: Array<{ id: string; title: string; slug: string; short_description: string | null }>;
};

function pagePath(permalink: string) {
	const normalized = `/${permalink.replace(/^\/+/, '')}`;

	return normalized === '/' ? normalized : normalized.replace(/\/+$/, '');
}

export function toSearchResults(data: SearchResponse): SearchResult[] {
	return [
		...data.pages.map((page) => ({
			id: `page:${page.id}`,
			title: page.title,
			description: '',
			type: 'Página',
			link: pagePath(page.permalink),
		})),
		...data.posts.map((post) => ({
			id: `post:${post.id}`,
			title: post.title,
			description: post.description ?? '',
			type: 'Artigo',
			link: `/blog/${encodeURIComponent(post.slug)}`,
		})),
		...data.events.map((event) => ({
			id: `event:${event.id}`,
			title: event.title,
			description: event.short_description ?? '',
			type: 'Evento',
			link: `/eventos/${encodeURIComponent(event.slug)}`,
		})),
	];
}
