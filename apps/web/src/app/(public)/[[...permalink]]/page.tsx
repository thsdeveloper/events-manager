import type { Page as PageContent, PageBlock } from '@events-manager/contracts';
import type { Metadata } from 'next';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import PageBuilder from '@/components/layout/PageBuilder';
import { isNotFound } from '@/lib/backend';
import { fetchPageData, fetchRedirects, fetchSiteData } from '@/lib/content/fetchers';
import {
	type SearchParamValue,
	isDraftPreview,
	parsePageNumber,
	previewExitHref,
	previewToken,
	resolvePermalink,
} from '@/lib/content/page-request';
import { resolveRedirect } from '@/lib/redirects';
import JsonLd from '@/lib/seo/JsonLd';
import {
	breadcrumbJsonLd,
	breadcrumbsFromPermalink,
	organizationJsonLd,
	webPageJsonLd,
	websiteJsonLd,
} from '@/lib/seo/json-ld';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { resolveSiteUrl } from '@/lib/seo/site-url';
import PreviewBanner from './PreviewBanner';

// ISR: a página publicada é servida do cache e renovada em segundo plano; o
// painel também invalida a tag `cms-content` a cada mudança. O preview de
// rascunho busca com `revalidate: 0`, então nunca entra nesse cache.
export const revalidate = 60;

interface PageProps {
	params: Promise<{ permalink?: string[] }>;
	searchParams: Promise<Record<string, SearchParamValue>>;
}

async function loadPage(permalink: string, postPage: number, token?: string): Promise<PageContent | null> {
	try {
		return await fetchPageData(permalink, postPage, token);
	} catch (error) {
		// Uma rota sem página cadastrada no CMS é fluxo normal (vira 404 ou
		// redirecionamento). Só falha real de API merece log de erro.
		if (!isNotFound(error)) {
			console.error('Error loading page:', error);
		}

		return null;
	}
}

/**
 * Sem página: segue o redirecionamento do CMS ou responde 404. Fica aqui (e
 * não só no componente) porque os metadados são resolvidos antes de o shell
 * ser enviado; assim o status HTTP é 404/301 de verdade, e não um 200 com a
 * tela de "não encontrado" transmitida depois.
 */
async function redirectOrNotFound(path: string): Promise<never> {
	const target = resolveRedirect(await fetchRedirects(), path);
	if (target?.permanent) permanentRedirect(target.destination);
	if (target) redirect(target.destination);

	notFound();
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
	const [{ permalink }, query] = await Promise.all([params, searchParams]);
	const path = resolvePermalink(permalink);
	const token = previewToken(query.preview);
	const [loaded, { globals }] = await Promise.all([loadPage(path, 1, token), fetchSiteData()]);
	const page = loaded ?? (await redirectOrNotFound(path));

	return buildPageMetadata({ page, globals, siteUrl: resolveSiteUrl(globals), path, preview: Boolean(token) });
}

export default async function Page({ params, searchParams }: PageProps) {
	const [{ permalink }, query] = await Promise.all([params, searchParams]);
	const path = resolvePermalink(permalink);
	const token = previewToken(query.preview);
	const [loaded, { globals }] = await Promise.all([
		loadPage(path, parsePageNumber(query.page), token),
		fetchSiteData(),
	]);
	// notFound()/redirect() ficam fora do try de loadPage: sinalizam via throw.
	const page = loaded ?? (await redirectOrNotFound(path));

	const blocks = (page.blocks ?? []).filter(
		(block): block is PageBlock => typeof block === 'object' && block !== null && Boolean(block.collection),
	);
	const siteUrl = resolveSiteUrl(globals);
	const structuredData =
		path === '/'
			? [websiteJsonLd(globals, siteUrl), organizationJsonLd(globals, siteUrl)]
			: [webPageJsonLd(page, siteUrl), breadcrumbJsonLd(breadcrumbsFromPermalink(path, page.title), siteUrl)];

	return (
		<>
			{isDraftPreview(page, token) && <PreviewBanner exitHref={previewExitHref(path, query)} />}
			<JsonLd data={structuredData} />
			<PageBuilder sections={blocks} />
		</>
	);
}
