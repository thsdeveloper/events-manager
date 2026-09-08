import type { Globals, Page, Post } from '@events-manager/contracts';
import { describe, expect, it } from 'vitest';
import { buildPageMetadata, buildPostMetadata } from './metadata';

const siteUrl = 'https://site.example';

const globals: Globals = {
	id: 'globals',
	title: 'Events Manager',
	description: 'Descrição padrão do site.',
	default_og_image: { id: 'og-default', bucket: 'media', path: 'cms/default-og.png' },
};

const page: Page = {
	id: 'page',
	title: 'Sobre nós',
	permalink: '/sobre',
	seo: { title: 'Sobre a plataforma', meta_description: 'Quem somos.' },
};

describe('buildPageMetadata', () => {
	it('uses the SEO title and description, falling back to the page title and the site description', () => {
		const withSeo = buildPageMetadata({ page, globals, siteUrl, path: '/sobre' });
		const withoutSeo = buildPageMetadata({ page: { ...page, seo: null }, globals, siteUrl, path: '/sobre' });

		expect(withSeo.title).toBe('Sobre a plataforma');
		expect(withSeo.description).toBe('Quem somos.');
		expect(withoutSeo.title).toBe('Sobre nós');
		expect(withoutSeo.description).toBe('Descrição padrão do site.');
	});

	it('does not repeat the site name on the home, whose SEO title already is the site name', () => {
		const home = buildPageMetadata({
			page: { ...page, permalink: '/', seo: { title: 'Events Manager' } },
			globals,
			siteUrl,
			path: '/',
		});

		expect(home.title).toEqual({ absolute: 'Events Manager' });
		expect(home.openGraph?.title).toBe('Events Manager');
	});

	it('points the canonical to the configured URL or to the page path on the site', () => {
		expect(buildPageMetadata({ page, globals, siteUrl, path: '/sobre' }).alternates?.canonical).toBe(
			'https://site.example/sobre',
		);
		expect(buildPageMetadata({ page, globals, siteUrl, path: '/' }).alternates?.canonical).toBe(
			'https://site.example/',
		);
		expect(
			buildPageMetadata({
				page: { ...page, seo: { canonical_url: 'https://outro.example/origem' } },
				globals,
				siteUrl,
				path: '/sobre',
			}).alternates?.canonical,
		).toBe('https://outro.example/origem');
	});

	it('translates the no_index / no_follow flags into robots directives', () => {
		expect(buildPageMetadata({ page, globals, siteUrl, path: '/sobre' }).robots).toEqual({ index: true, follow: true });
		expect(
			buildPageMetadata({
				page: { ...page, seo: { no_index: true, no_follow: true } },
				globals,
				siteUrl,
				path: '/sobre',
			}).robots,
		).toEqual({ index: false, follow: false });
	});

	it('never lets a draft preview be indexed, whatever the page says', () => {
		const metadata = buildPageMetadata({ page, globals, siteUrl, path: '/sobre', preview: true });

		expect(metadata.robots).toEqual({ index: false, follow: false });
	});

	it('builds Open Graph for a website with the page image, the site default image or none', () => {
		const withOwnImage = buildPageMetadata({
			page: { ...page, seo: { ...page.seo, og_image: 'https://cdn.example/sobre.png' } },
			globals,
			siteUrl,
			path: '/sobre',
		});
		const withDefault = buildPageMetadata({ page, globals, siteUrl, path: '/sobre' });
		const withoutAny = buildPageMetadata({
			page,
			globals: { ...globals, default_og_image: null },
			siteUrl,
			path: '/sobre',
		});

		expect(withOwnImage.openGraph).toMatchObject({
			type: 'website',
			url: 'https://site.example/sobre',
			siteName: 'Events Manager',
			title: 'Sobre a plataforma',
			description: 'Quem somos.',
			images: [{ url: 'https://cdn.example/sobre.png' }],
		});
		expect(withOwnImage.twitter).toMatchObject({
			card: 'summary_large_image',
			images: ['https://cdn.example/sobre.png'],
		});
		expect(withDefault.openGraph).toMatchObject({
			images: [{ url: expect.stringMatching(/\/storage\/v1\/object\/public\/media\/cms\/default-og\.png$/) }],
		});
		expect(withoutAny.openGraph).not.toHaveProperty('images');
		expect(withoutAny.twitter).toBeUndefined();
	});

	it('turns a media id into an absolute URL of the site so crawlers can fetch it', () => {
		const metadata = buildPageMetadata({
			page: { ...page, seo: { og_image: '11111111-1111-4111-8111-111111111111' } },
			globals,
			siteUrl,
			path: '/sobre',
		});

		expect(metadata.openGraph).toMatchObject({
			images: [{ url: 'https://site.example/api/media/11111111-1111-4111-8111-111111111111' }],
		});
	});
});

describe('buildPostMetadata', () => {
	const post: Post = {
		id: 'post',
		name: 'Bem-vindo',
		title: 'Bem-vindo ao blog',
		slug: 'bem-vindo',
		description: 'Resumo do post.',
		published_at: '2026-09-01T12:00:00.000Z',
		date_updated: '2026-09-03T08:00:00.000Z',
		image: { id: 'cover', bucket: 'media', path: 'cms/cover.jpg' },
		author: { id: 'u1', first_name: 'Ana', last_name: 'Souza' },
		seo: { title: 'Bem-vindo (SEO)' },
	};

	it('describes the post as an article with its cover image, dates and author', () => {
		const metadata = buildPostMetadata({ post, globals, siteUrl, path: '/blog/bem-vindo' });

		expect(metadata.title).toBe('Bem-vindo (SEO)');
		expect(metadata.description).toBe('Resumo do post.');
		expect(metadata.alternates?.canonical).toBe('https://site.example/blog/bem-vindo');
		expect(metadata.openGraph).toMatchObject({
			type: 'article',
			url: 'https://site.example/blog/bem-vindo',
			publishedTime: '2026-09-01T12:00:00.000Z',
			modifiedTime: '2026-09-03T08:00:00.000Z',
			authors: ['Ana Souza'],
			images: [{ url: expect.stringMatching(/\/media\/cms\/cover\.jpg$/) }],
		});
		expect(metadata.twitter).toMatchObject({ card: 'summary_large_image' });
	});

	it('falls back to the site default image when the post has no cover', () => {
		const metadata = buildPostMetadata({ post: { ...post, image: null }, globals, siteUrl, path: '/blog/bem-vindo' });

		expect(metadata.openGraph).toMatchObject({ images: [{ url: expect.stringMatching(/default-og\.png$/) }] });
	});
});
