import type { Globals, Page, Post } from '@events-manager/contracts';
import { postAuthorName } from './metadata';
import { absoluteMediaUrl, absoluteUrl } from './site-url';

export type JsonLdObject = Record<string, unknown>;

export interface BreadcrumbSegment {
	name: string;
	path: string;
}

const SCHEMA_CONTEXT = 'https://schema.org';

function compact<T extends JsonLdObject>(object: T): T {
	return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined)) as T;
}

function isHttpUrl(value: string | null | undefined): value is string {
	return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
}

export function websiteJsonLd(globals: Globals, siteUrl: string): JsonLdObject {
	return compact({
		'@context': SCHEMA_CONTEXT,
		'@type': 'WebSite',
		name: globals.title ?? undefined,
		description: globals.description ?? undefined,
		url: siteUrl,
		potentialAction: {
			'@type': 'SearchAction',
			target: { '@type': 'EntryPoint', urlTemplate: `${siteUrl}/eventos?search={search_term_string}` },
			'query-input': 'required name=search_term_string',
		},
	});
}

export function organizationJsonLd(globals: Globals, siteUrl: string): JsonLdObject {
	const sameAs = (globals.social_links ?? []).map((link) => link.url).filter(isHttpUrl);

	return compact({
		'@context': SCHEMA_CONTEXT,
		'@type': 'Organization',
		name: globals.title ?? undefined,
		url: siteUrl,
		logo: absoluteMediaUrl(siteUrl, globals.logo),
		sameAs: sameAs.length > 0 ? sameAs : undefined,
	});
}

export function webPageJsonLd(page: Page, siteUrl: string): JsonLdObject {
	return compact({
		'@context': SCHEMA_CONTEXT,
		'@type': 'WebPage',
		name: page.seo?.title ?? page.title,
		description: page.seo?.meta_description ?? undefined,
		url: absoluteUrl(siteUrl, page.permalink),
		datePublished: page.published_at ?? undefined,
		dateModified: page.date_updated ?? page.published_at ?? undefined,
	});
}

function humanizeSegment(segment: string): string {
	const words = decodeURIComponent(segment).replace(/[-_]+/g, ' ').trim();

	return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Trilha a partir do permalink: Início → segmentos intermediários → a própria página. */
export function breadcrumbsFromPermalink(permalink: string, title: string): BreadcrumbSegment[] {
	const segments = permalink.split('/').filter(Boolean);
	const trail: BreadcrumbSegment[] = [{ name: 'Início', path: '/' }];

	segments.forEach((segment, index) => {
		const isLast = index === segments.length - 1;
		trail.push({ name: isLast ? title : humanizeSegment(segment), path: `/${segments.slice(0, index + 1).join('/')}` });
	});

	return trail;
}

export function breadcrumbJsonLd(segments: BreadcrumbSegment[], siteUrl: string): JsonLdObject {
	return {
		'@context': SCHEMA_CONTEXT,
		'@type': 'BreadcrumbList',
		itemListElement: segments.map((segment, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: segment.name,
			item: absoluteUrl(siteUrl, segment.path),
		})),
	};
}

export function blogPostingJsonLd(post: Post, siteUrl: string): JsonLdObject {
	const url = absoluteUrl(siteUrl, `/blog/${post.slug ?? ''}`);
	const author = postAuthorName(post.author);

	return compact({
		'@context': SCHEMA_CONTEXT,
		'@type': 'BlogPosting',
		headline: post.title,
		description: post.description ?? post.seo?.meta_description ?? undefined,
		url,
		mainEntityOfPage: url,
		datePublished: post.published_at ?? undefined,
		dateModified: post.date_updated ?? post.published_at ?? undefined,
		author: author ? { '@type': 'Person', name: author } : undefined,
		image: absoluteMediaUrl(siteUrl, post.image),
	});
}

export function blogCollectionJsonLd({
	siteUrl,
	title,
	description,
	posts,
}: {
	siteUrl: string;
	title: string;
	description?: string | null;
	posts: Array<Pick<Post, 'slug' | 'title'>>;
}): JsonLdObject {
	return compact({
		'@context': SCHEMA_CONTEXT,
		'@type': 'CollectionPage',
		name: title,
		description: description ?? undefined,
		url: `${siteUrl}/blog`,
		mainEntity: {
			'@type': 'Blog',
			blogPost: posts.map((post) => ({
				'@type': 'BlogPosting',
				headline: post.title,
				url: absoluteUrl(siteUrl, `/blog/${post.slug ?? ''}`),
			})),
		},
	});
}

/** `<` vira `<` para que nenhum texto editorial consiga fechar o `<script>`. */
export function serializeJsonLd(data: unknown): string {
	return JSON.stringify(data).replace(/</g, '\\u003c');
}
