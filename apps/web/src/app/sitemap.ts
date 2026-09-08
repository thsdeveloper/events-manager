import type { MetadataRoute } from 'next';
import { backendFetch } from '@/lib/backend';
import { fetchSiteData } from '@/lib/content/fetchers';
import { resolveSiteUrl } from '@/lib/seo/site-url';

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;

interface SitemapEntry {
	change_frequency?: ChangeFrequency | null;
	date_updated?: string | null;
	priority?: string | number | null;
	published_at?: string | null;
}

type SitemapData = {
	pages: Array<SitemapEntry & { permalink: string }>;
	posts: Array<SitemapEntry & { slug: string }>;
	events: Array<{ slug: string; start_date?: string | null; date_updated?: string | null }>;
};

const DEFAULTS = {
	page: { changeFrequency: 'weekly', priority: 0.7 },
	post: { changeFrequency: 'monthly', priority: 0.6 },
	event: { changeFrequency: 'weekly', priority: 0.8 },
} satisfies Record<string, { changeFrequency: ChangeFrequency; priority: number }>;

function parsePriority(value: string | number | null | undefined, fallback: number) {
	const parsed = typeof value === 'number' ? value : Number.parseFloat(value ?? '');

	return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback;
}

function entryFor(
	url: string,
	entry: SitemapEntry,
	defaults: { changeFrequency: ChangeFrequency; priority: number },
	now: string,
): MetadataRoute.Sitemap[number] {
	return {
		url,
		lastModified: entry.date_updated || entry.published_at || now,
		changeFrequency: entry.change_frequency ?? defaults.changeFrequency,
		priority: parsePriority(entry.priority, defaults.priority),
	};
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const { globals } = await fetchSiteData();
	const siteUrl = resolveSiteUrl(globals);
	const now = new Date().toISOString();
	const fixed: MetadataRoute.Sitemap = [
		{ url: `${siteUrl}/eventos`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
		{ url: `${siteUrl}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
		{ url: `${siteUrl}/taxas`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
	];

	try {
		// A API já exclui páginas `noindex` e agendadas para o futuro.
		const { pages, posts, events } = await backendFetch<SitemapData>('/api/content/sitemap');

		const pageUrls = pages
			.filter((page) => page.permalink)
			.map((page) => entryFor(`${siteUrl}${page.permalink === '/' ? '/' : page.permalink}`, page, DEFAULTS.page, now));
		const postUrls = posts
			.filter((post) => post.slug)
			.map((post) => entryFor(`${siteUrl}/blog/${post.slug}`, post, DEFAULTS.post, now));
		const eventUrls = events.map((event) =>
			entryFor(
				`${siteUrl}/eventos/${event.slug}`,
				{ date_updated: event.date_updated, published_at: event.start_date },
				DEFAULTS.event,
				now,
			),
		);

		const entries = [...pageUrls, ...fixed, ...postUrls, ...eventUrls];

		return [...new Map(entries.map((entry) => [entry.url, entry])).values()];
	} catch (error) {
		console.error('Error generating sitemap:', error);

		return [{ url: siteUrl, lastModified: now }, ...fixed];
	}
}
