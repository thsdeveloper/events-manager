import { fetchPageData } from '@/lib/content/fetchers';
import { PageBlock } from '@events-manager/contracts';
import { notFound } from 'next/navigation';
import PageClient from './PageClient';

export async function generateMetadata({ params }: { params: Promise<{ permalink?: string[] }> }) {
	const { permalink } = await params;
	const permalinkSegments = permalink || [];
	const resolvedPermalink = `/${permalinkSegments.join('/')}`.replace(/\/$/, '') || '/';

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
		console.error('Error loading page metadata:', error);

		return;
	}
}

export default async function Page({ params }: { params: Promise<{ permalink?: string[] }> }) {
	const { permalink } = await params;
	const permalinkSegments = permalink || [];
	const resolvedPermalink = `/${permalinkSegments.join('/')}`.replace(/\/$/, '') || '/';

	try {
		const page = await fetchPageData(resolvedPermalink);

		if (!page || !page.blocks) {
			notFound();
		}

		const blocks: PageBlock[] = page.blocks.filter(
			(block: any): block is PageBlock => typeof block === 'object' && block.collection,
		);

		return <PageClient sections={blocks} />;
	} catch (error) {
		console.error('Error loading page:', error);
		notFound();
	}
}
