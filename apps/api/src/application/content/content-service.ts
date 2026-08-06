import type { Globals, Navigation, Page, Post, Redirect } from '@events-manager/contracts';

export interface SiteContent {
	footerNavigation: Navigation;
	globals: Globals;
	headerNavigation: Navigation;
}

export interface PostList {
	data: PublicPostSummary[];
	limit: number;
	page: number;
	total: number;
}

export interface PublicPostSummary {
	description?: string | null;
	id: string;
	image?: unknown;
	name?: string;
	published_at?: string | null;
	slug: string;
	title: string;
}

export interface PublicSearchResults {
	events: Array<{ id: string; title: string; slug: string; short_description: string | null }>;
	pages: Array<{ id: string; title: string; permalink: string }>;
	posts: Array<{ id: string; title: string; slug: string; description: string | null }>;
}

export interface ContentRepository {
	getPage(permalink: string, postPage: number): Promise<Page>;
	getPost(slug: string): Promise<{ post: Post | null; relatedPosts: PublicPostSummary[] }>;
	getRedirects(): Promise<Array<Pick<Redirect, 'response_code' | 'url_from' | 'url_to'>>>;
	getSite(): Promise<SiteContent>;
	listPosts(limit: number, page: number): Promise<PostList>;
	search(query: string): Promise<PublicSearchResults>;
	getSitemap(): Promise<{
		pages: Array<{ permalink: string; published_at: string | null; date_updated: string }>;
		posts: Array<{ slug: string; published_at: string | null; date_updated: string }>;
		events: Array<{ slug: string; start_date: string; date_updated: string }>;
	}>;
}

export class ContentService {
	constructor(private readonly repository: ContentRepository) {}

	getSite() {
		return this.repository.getSite();
	}

	getPage(permalink: string, postPage = 1) {
		return this.repository.getPage(permalink, postPage);
	}

	getPost(slug: string) {
		return this.repository.getPost(slug);
	}

	listPosts(limit: number, page: number) {
		return this.repository.listPosts(limit, page);
	}

	getRedirects() {
		return this.repository.getRedirects();
	}

	search(query: string) {
		if (query.length < 2) return Promise.resolve({ pages: [], posts: [], events: [] });
		return this.repository.search(query);
	}

	getSitemap() {
		return this.repository.getSitemap();
	}
}
