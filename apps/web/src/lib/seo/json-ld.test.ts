import type { Globals, Page, Post } from '@events-manager/contracts';
import { describe, expect, it } from 'vitest';
import {
	blogCollectionJsonLd,
	blogPostingJsonLd,
	breadcrumbJsonLd,
	breadcrumbsFromPermalink,
	organizationJsonLd,
	serializeJsonLd,
	webPageJsonLd,
	websiteJsonLd,
} from './json-ld';

const siteUrl = 'https://site.example';

const globals: Globals = {
	id: 'globals',
	title: 'Events Manager',
	description: 'Descubra experiências.',
	logo: { id: 'logo', bucket: 'media', path: 'cms/logo.png' },
	social_links: [
		{ service: 'instagram', url: 'https://instagram.com/events' },
		{ service: 'github', url: 'javascript:alert(1)' },
	],
};

describe('websiteJsonLd', () => {
	it('describes the site and how to search events on it', () => {
		expect(websiteJsonLd(globals, siteUrl)).toEqual({
			'@context': 'https://schema.org',
			'@type': 'WebSite',
			name: 'Events Manager',
			description: 'Descubra experiências.',
			url: 'https://site.example',
			potentialAction: {
				'@type': 'SearchAction',
				target: {
					'@type': 'EntryPoint',
					urlTemplate: 'https://site.example/eventos?search={search_term_string}',
				},
				'query-input': 'required name=search_term_string',
			},
		});
	});
});

describe('organizationJsonLd', () => {
	it('lists the logo and only safe social profile URLs', () => {
		const data = organizationJsonLd(globals, siteUrl);

		expect(data).toMatchObject({
			'@type': 'Organization',
			name: 'Events Manager',
			url: 'https://site.example',
			logo: expect.stringMatching(/\/media\/cms\/logo\.png$/),
			sameAs: ['https://instagram.com/events'],
		});
	});

	it('omits logo and sameAs when the site has none', () => {
		const data = organizationJsonLd({ id: 'g', title: 'Site' }, siteUrl);

		expect(data).not.toHaveProperty('logo');
		expect(data).not.toHaveProperty('sameAs');
	});
});

describe('webPageJsonLd + breadcrumbs', () => {
	const page: Page = {
		id: 'p',
		title: 'Política de privacidade',
		permalink: '/legal/privacidade',
		seo: { meta_description: 'Como tratamos dados.' },
		published_at: '2026-09-01T00:00:00.000Z',
		date_updated: '2026-09-02T00:00:00.000Z',
	};

	it('describes the page with its canonical URL and dates', () => {
		expect(webPageJsonLd(page, siteUrl)).toEqual({
			'@context': 'https://schema.org',
			'@type': 'WebPage',
			name: 'Política de privacidade',
			description: 'Como tratamos dados.',
			url: 'https://site.example/legal/privacidade',
			datePublished: '2026-09-01T00:00:00.000Z',
			dateModified: '2026-09-02T00:00:00.000Z',
		});
	});

	it('derives breadcrumbs from the permalink, starting at the home and ending with the page title', () => {
		expect(breadcrumbsFromPermalink('/legal/privacidade', 'Política de privacidade')).toEqual([
			{ name: 'Início', path: '/' },
			{ name: 'Legal', path: '/legal' },
			{ name: 'Política de privacidade', path: '/legal/privacidade' },
		]);
	});

	it('serializes breadcrumbs as an ordered BreadcrumbList with absolute URLs', () => {
		expect(
			breadcrumbJsonLd(
				[
					{ name: 'Início', path: '/' },
					{ name: 'Blog', path: '/blog' },
				],
				siteUrl,
			),
		).toEqual({
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: [
				{ '@type': 'ListItem', position: 1, name: 'Início', item: 'https://site.example/' },
				{ '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://site.example/blog' },
			],
		});
	});
});

describe('blogPostingJsonLd', () => {
	const post: Post = {
		id: 'post',
		name: 'Bem-vindo',
		title: 'Bem-vindo ao blog',
		slug: 'bem-vindo',
		description: 'Resumo.',
		published_at: '2026-09-01T12:00:00.000Z',
		date_updated: '2026-09-03T08:00:00.000Z',
		image: { id: 'cover', bucket: 'media', path: 'cms/cover.jpg' },
		author: { id: 'u1', first_name: 'Ana', last_name: 'Souza' },
	};

	it('describes the article with headline, dates, author name and cover image', () => {
		expect(blogPostingJsonLd(post, siteUrl)).toMatchObject({
			'@context': 'https://schema.org',
			'@type': 'BlogPosting',
			headline: 'Bem-vindo ao blog',
			description: 'Resumo.',
			url: 'https://site.example/blog/bem-vindo',
			mainEntityOfPage: 'https://site.example/blog/bem-vindo',
			datePublished: '2026-09-01T12:00:00.000Z',
			dateModified: '2026-09-03T08:00:00.000Z',
			author: { '@type': 'Person', name: 'Ana Souza' },
			image: expect.stringMatching(/\/media\/cms\/cover\.jpg$/),
		});
	});

	it('leaves out author and image when the post has none', () => {
		const data = blogPostingJsonLd({ ...post, author: null, image: null }, siteUrl);

		expect(data).not.toHaveProperty('author');
		expect(data).not.toHaveProperty('image');
	});
});

describe('blogCollectionJsonLd', () => {
	it('describes the blog index as a collection page listing the visible posts', () => {
		expect(
			blogCollectionJsonLd({ siteUrl, title: 'Blog', description: 'Novidades', posts: [{ slug: 'a', title: 'A' }] }),
		).toEqual({
			'@context': 'https://schema.org',
			'@type': 'CollectionPage',
			name: 'Blog',
			description: 'Novidades',
			url: 'https://site.example/blog',
			mainEntity: {
				'@type': 'Blog',
				blogPost: [{ '@type': 'BlogPosting', headline: 'A', url: 'https://site.example/blog/a' }],
			},
		});
	});
});

describe('serializeJsonLd', () => {
	it('escapes "<" so content cannot close the script tag', () => {
		expect(serializeJsonLd({ name: '</script><script>alert(1)</script>' })).toBe(
			'{"name":"\\u003c/script>\\u003cscript>alert(1)\\u003c/script>"}',
		);
	});
});
