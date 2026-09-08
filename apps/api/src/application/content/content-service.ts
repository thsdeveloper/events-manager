import {
	sanitizeHtml,
	type Globals,
	type Navigation,
	type Page,
	type Post,
	type Redirect,
} from '@events-manager/contracts';
import { verifyPreviewToken } from '../cms/preview-token.js';

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

export interface PageReadOptions {
	/** Um token de preview válido libera rascunhos e páginas agendadas. */
	includeDrafts: boolean;
	/** Instante de referência, em ISO, para o agendamento de publicação. */
	now: string;
}

interface SitemapSeo {
	no_index?: boolean | null;
	sitemap?: { change_frequency?: string | null; priority?: number | string | null } | null;
}

export interface SitemapSource {
	pages: Array<{ permalink: string; published_at: string | null; date_updated: string; seo?: SitemapSeo | null }>;
	posts: Array<{ slug: string; published_at: string | null; date_updated: string; seo?: SitemapSeo | null }>;
	events: Array<{ slug: string; start_date: string; date_updated: string }>;
}

export interface SitemapEntry {
	change_frequency?: string | null;
	date_updated: string;
	priority?: number | null;
	published_at: string | null;
}

/** Tabela pública de taxas: só o que o site divulga, nunca o gateway ou prefixos operacionais. */
export interface PublicFeeTable {
	boleto_fee_fixed: number;
	card_fee_fixed: number;
	card_fee_percentage: number;
	card_installment_2_6_percentage: number;
	card_installment_7_12_percentage: number;
	convenience_fee_calculation_method: 'buyer_pays' | 'organizer_absorbs';
	minimum_payout: number;
	payout_fee_fixed: number;
	pix_fee_fixed: number;
	platform_fee_percentage: number;
}

export interface ContentRepository {
	getFees(): Promise<PublicFeeTable>;
	getPage(permalink: string, postPage: number, options: PageReadOptions): Promise<Page>;
	getPost(slug: string): Promise<{ post: Post | null; relatedPosts: PublicPostSummary[] }>;
	getRedirects(): Promise<Array<Pick<Redirect, 'response_code' | 'url_from' | 'url_to'>>>;
	getSite(): Promise<SiteContent>;
	listPosts(limit: number, page: number): Promise<PostList>;
	search(query: string): Promise<PublicSearchResults>;
	getSitemap(): Promise<SitemapSource>;
}

export interface ContentServiceOptions {
	previewSecret: string;
	now?: () => Date;
}

function isVisible(published_at: string | null | undefined, seo: SitemapSeo | null | undefined, now: Date) {
	if (seo?.no_index) return false;
	if (published_at && new Date(published_at).getTime() > now.getTime()) return false;
	return true;
}

function sitemapHints(seo: SitemapSeo | null | undefined) {
	const priority = seo?.sitemap?.priority;
	return {
		change_frequency: seo?.sitemap?.change_frequency ?? null,
		priority: priority === null || priority === undefined || priority === '' ? null : Number(priority),
	};
}

export class ContentService {
	private readonly now: () => Date;

	constructor(
		private readonly repository: ContentRepository,
		private readonly options: ContentServiceOptions,
	) {
		this.now = options.now ?? (() => new Date());
	}

	getSite() {
		return this.repository.getSite();
	}

	getFees() {
		return this.repository.getFees();
	}

	async getPage(permalink: string, postPage = 1, previewToken?: string | null) {
		const now = this.now();
		const includeDrafts = Boolean(
			previewToken && verifyPreviewToken(this.options.previewSecret, previewToken, permalink, now),
		);
		const page = await this.repository.getPage(permalink, postPage, { includeDrafts, now: now.toISOString() });
		const blocks = Array.isArray(page.blocks)
			? page.blocks.map((block) => {
					if (typeof block !== 'object' || block === null) return block;
					const item = block.item;
					if (block.collection === 'block_richtext' && item && typeof item === 'object' && 'content' in item) {
						return { ...block, item: { ...item, content: sanitizeHtml(String(item.content ?? '')) } };
					}
					return block;
				})
			: page.blocks;
		return { ...page, blocks };
	}

	async getPost(slug: string) {
		const result = await this.repository.getPost(slug);
		if (!result.post) return result;
		return { ...result, post: { ...result.post, content: sanitizeHtml(result.post.content) } };
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

	/**
	 * O repositório devolve tudo que está publicado; aqui saem as entradas que
	 * um robô não deve visitar (noindex) ou que ainda não chegaram à data
	 * agendada, e entram as dicas de frequência/prioridade definidas no painel.
	 */
	async getSitemap() {
		const { pages, posts, events } = await this.repository.getSitemap();
		const now = this.now();
		return {
			pages: pages
				.filter((page) => isVisible(page.published_at, page.seo, now))
				.map(({ permalink, published_at, date_updated, seo }) => ({
					permalink,
					published_at,
					date_updated,
					...sitemapHints(seo),
				})),
			posts: posts
				.filter((post) => isVisible(post.published_at, post.seo, now))
				.map(({ slug, published_at, date_updated, seo }) => ({
					slug,
					published_at,
					date_updated,
					...sitemapHints(seo),
				})),
			events,
		};
	}
}
