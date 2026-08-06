import type { MetadataRoute } from 'next';
import { backendFetch } from '@/lib/backend';

type SitemapData = {
	pages: Array<{ permalink: string; published_at?: string | null; date_updated?: string | null }>;
	posts: Array<{ slug: string; published_at?: string | null; date_updated?: string | null }>;
	events: Array<{ slug: string; start_date?: string | null; date_updated?: string | null }>;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3003';

	try {
		const { pages, posts, events } = await backendFetch<SitemapData>('/api/content/sitemap');

		const pageUrls = pages
			.filter((page) => page.permalink)
			.map((page) => ({
				url: `${siteUrl}${page.permalink}`,
				lastModified: page.date_updated || page.published_at || new Date().toISOString(),
			}));

		const postUrls = posts
			.filter((post) => post.slug)
			.map((post) => ({
				url: `${siteUrl}/blog/${post.slug}`,
				lastModified: post.date_updated || post.published_at || new Date().toISOString(),
			}));

		const eventUrls = events.map((event) => ({
			url: `${siteUrl}/eventos/${event.slug}`,
			lastModified: event.date_updated || event.start_date || new Date().toISOString(),
		}));

		const entries = [{ url: `${siteUrl}/eventos`, lastModified: new Date().toISOString() }, ...pageUrls, ...postUrls, ...eventUrls];

		return [...new Map(entries.map((entry) => [entry.url, entry])).values()];
	} catch (error) {
		console.error('Error generating sitemap:', error);

		return [
			{ url: siteUrl, lastModified: new Date().toISOString() },
			{ url: `${siteUrl}/eventos`, lastModified: new Date().toISOString() },
		];
	}
}
