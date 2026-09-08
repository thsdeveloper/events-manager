import type { AppUser, ExtensionSeoMetadata, Globals, MediaFile, Page, Post } from '@events-manager/contracts';
import type { Metadata } from 'next';
import { absoluteMediaUrl, absoluteUrl } from './site-url';

interface BaseMetadataInput {
	globals: Globals;
	siteUrl: string;
	/** Caminho da rota atual, começando por `/`. */
	path: string;
	/** Pré-visualização de rascunho: nunca indexar. */
	preview?: boolean;
}

export interface PageMetadataInput extends BaseMetadataInput {
	page: Page;
}

export interface PostMetadataInput extends BaseMetadataInput {
	post: Post;
}

interface ResolvedFields {
	title: string;
	description?: string;
	canonical: string;
	image?: string;
}

function robotsFor(seo: ExtensionSeoMetadata | null | undefined, preview: boolean): Metadata['robots'] {
	if (preview) return { index: false, follow: false };

	return { index: !seo?.no_index, follow: !seo?.no_follow };
}

function resolveFields(
	{ title, seo, image }: { title: string; seo?: ExtensionSeoMetadata | null; image?: string | MediaFile | null },
	{ globals, siteUrl, path }: BaseMetadataInput,
): ResolvedFields {
	const ownImage = seo?.og_image ?? image;

	return {
		title: seo?.title ?? title,
		description: seo?.meta_description ?? globals.description ?? undefined,
		canonical: seo?.canonical_url ?? `${siteUrl}${path}`,
		image: absoluteMediaUrl(siteUrl, ownImage) ?? absoluteMediaUrl(siteUrl, globals.default_og_image),
	};
}

function socialCards(fields: ResolvedFields, input: BaseMetadataInput): Pick<Metadata, 'openGraph' | 'twitter'> {
	const openGraph: NonNullable<Metadata['openGraph']> = {
		url: absoluteUrl(input.siteUrl, input.path),
		siteName: input.globals.title ?? undefined,
		title: fields.title,
		description: fields.description,
		locale: 'pt_BR',
	};

	if (!fields.image) return { openGraph };

	return {
		openGraph: { ...openGraph, images: [{ url: fields.image }] },
		twitter: {
			card: 'summary_large_image',
			title: fields.title,
			description: fields.description,
			images: [fields.image],
		},
	};
}

export function buildPageMetadata(input: PageMetadataInput): Metadata {
	const { page, preview = false } = input;
	const fields = resolveFields({ title: page.title, seo: page.seo }, input);
	const { openGraph, twitter } = socialCards(fields, input);

	// O layout raiz aplica o template "%s | Site"; na home o título já é o nome
	// do site, então sai sem o sufixo repetido.
	const title = fields.title === input.globals.title ? { absolute: fields.title } : fields.title;

	return {
		title,
		description: fields.description,
		alternates: { canonical: fields.canonical },
		robots: robotsFor(page.seo, preview),
		openGraph: { ...openGraph, type: 'website' },
		twitter,
	};
}

function authorName(author: Post['author']): string | undefined {
	if (!author || typeof author === 'string') return undefined;
	const name = [author.first_name, author.last_name].filter(Boolean).join(' ');

	return name || undefined;
}

export function postAuthorName(author: AppUser | string | null | undefined): string | undefined {
	return authorName(author);
}

export function buildPostMetadata(input: PostMetadataInput): Metadata {
	const { post, preview = false } = input;
	const fields = resolveFields({ title: post.title, seo: post.seo, image: post.image }, input);
	const { openGraph, twitter } = socialCards(fields, input);
	const author = authorName(post.author);

	return {
		title: fields.title,
		description: post.description ?? fields.description,
		alternates: { canonical: fields.canonical },
		robots: robotsFor(post.seo, preview),
		openGraph: {
			...openGraph,
			description: post.description ?? fields.description,
			type: 'article',
			publishedTime: post.published_at ?? undefined,
			modifiedTime: post.date_updated ?? post.published_at ?? undefined,
			authors: author ? [author] : undefined,
		},
		twitter: twitter ? { ...twitter, description: post.description ?? fields.description } : undefined,
	};
}
