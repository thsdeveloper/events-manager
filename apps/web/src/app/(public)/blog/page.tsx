import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchPaginatedPosts, fetchSiteData, fetchTotalPostCount } from '@/lib/content/fetchers';
import { type SearchParamValue, pageCount, parsePageNumber } from '@/lib/content/page-request';
import JsonLd from '@/lib/seo/JsonLd';
import { blogCollectionJsonLd, breadcrumbJsonLd } from '@/lib/seo/json-ld';
import { resolveSiteUrl } from '@/lib/seo/site-url';
import BlogIndex, { blogPageHref } from './BlogIndex';

export const revalidate = 60;

const POSTS_PER_PAGE = 9;
const BLOG_TITLE = 'Blog';
const BLOG_DESCRIPTION =
	'Dicas para organizadores, novidades da plataforma e histórias de quem faz eventos acontecerem.';

interface BlogPageProps {
	searchParams: Promise<Record<string, SearchParamValue>>;
}

/**
 * Página além da última é 404, decidido pelo total antes de pedir os posts:
 * a API não aceita um deslocamento maior que o acervo.
 */
async function loadIndex(page: number) {
	const [total, { globals }] = await Promise.all([fetchTotalPostCount(), fetchSiteData()]);
	const totalPages = pageCount(total, POSTS_PER_PAGE);

	if (page > 1 && page > totalPages) notFound();

	return { globals, totalPages };
}

export async function generateMetadata({ searchParams }: BlogPageProps): Promise<Metadata> {
	const page = parsePageNumber((await searchParams).page);
	const { globals } = await loadIndex(page);
	const siteUrl = resolveSiteUrl(globals);
	const title = page > 1 ? `${BLOG_TITLE} — página ${page}` : BLOG_TITLE;

	return {
		title,
		description: BLOG_DESCRIPTION,
		alternates: { canonical: `${siteUrl}${blogPageHref(page)}` },
		robots: { index: true, follow: true },
		openGraph: {
			type: 'website',
			url: `${siteUrl}${blogPageHref(page)}`,
			siteName: globals.title ?? undefined,
			title,
			description: BLOG_DESCRIPTION,
			locale: 'pt_BR',
		},
	};
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
	const page = parsePageNumber((await searchParams).page);
	const { globals, totalPages } = await loadIndex(page);
	const posts = totalPages === 0 ? [] : await fetchPaginatedPosts(POSTS_PER_PAGE, page);
	const siteUrl = resolveSiteUrl(globals);

	return (
		<>
			<JsonLd
				data={[
					blogCollectionJsonLd({ siteUrl, title: BLOG_TITLE, description: BLOG_DESCRIPTION, posts }),
					breadcrumbJsonLd(
						[
							{ name: 'Início', path: '/' },
							{ name: BLOG_TITLE, path: '/blog' },
						],
						siteUrl,
					),
				]}
			/>
			<BlogIndex posts={posts} page={page} totalPages={totalPages} />
		</>
	);
}
