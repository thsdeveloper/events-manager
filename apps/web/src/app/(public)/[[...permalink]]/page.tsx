import { isNotFound } from '@/lib/backend';
import { fetchPageData } from '@/lib/content/fetchers';
import { Page as PageContent, PageBlock } from '@events-manager/contracts';
import { notFound } from 'next/navigation';
import PageClient from './PageClient';

function resolvePermalink(permalink?: string[]) {
	return `/${(permalink ?? []).join('/')}`.replace(/\/$/, '') || '/';
}

export async function generateMetadata({ params }: { params: Promise<{ permalink?: string[] }> }) {
	const { permalink } = await params;
	const resolvedPermalink = resolvePermalink(permalink);

	try {
		const page = await fetchPageData(resolvedPermalink);

		if (!page) return;

		return {
			title: page.seo?.title ?? page.title ?? '',
			description: page.seo?.meta_description ?? '',
			openGraph: {
				title: page.seo?.title ?? page.title ?? '',
				description: page.seo?.meta_description ?? '',
				url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3003'}${resolvedPermalink}`,
				type: 'website',
			},
		};
	} catch (error) {
		// Uma rota sem página cadastrada no CMS é fluxo normal: o próprio Page
		// responde com notFound(). Só falha real de API merece log de erro.
		if (!isNotFound(error)) {
			console.error('Error loading page metadata:', error);
		}

		return;
	}
}

export default async function Page({ params }: { params: Promise<{ permalink?: string[] }> }) {
	const { permalink } = await params;
	const resolvedPermalink = resolvePermalink(permalink);

	let page: PageContent | null = null;

	try {
		page = await fetchPageData(resolvedPermalink);
	} catch (error) {
		if (!isNotFound(error)) {
			console.error('Error loading page:', error);
		}
	}

	// notFound() fica fora do try: ele sinaliza via throw e seria engolido pelo catch.
	if (!page?.blocks) {
		notFound();
	}

	const blocks: PageBlock[] = page.blocks.filter(
		(block: any): block is PageBlock => typeof block === 'object' && block.collection,
	);

	return <PageClient sections={blocks} />;
}
