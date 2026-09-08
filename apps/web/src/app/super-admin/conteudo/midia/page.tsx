import { Suspense } from 'react';
import { fetchCmsMedia } from '@/features/cms/api/server';
import { CmsPageHeader } from '@/features/cms/components/CmsPageHeader';
import { ListToolbar } from '@/features/cms/components/ListToolbar';
import { MediaLibrary } from '@/features/cms/components/MediaLibrary';
import { PaginationLinks } from '@/features/cms/components/PaginationLinks';

interface MediaPageProps {
	searchParams: Promise<{ page?: string; search?: string }>;
}

export default async function MediaPage({ searchParams }: MediaPageProps) {
	const params = await searchParams;
	const result = await fetchCmsMedia({ page: Number(params.page ?? 1), search: params.search, limit: 36 });

	return (
		<div className="space-y-6">
			<CmsPageHeader
				title="Mídia"
				description="Biblioteca de imagens e PDFs usados nas páginas, posts e na identidade do site."
			/>
			<Suspense>
				<ListToolbar withStatus={false} placeholder="Buscar por título ou nome do arquivo" />
			</Suspense>
			<MediaLibrary media={result.data} />
			<PaginationLinks
				pagination={result.pagination}
				pathname="/super-admin/conteudo/midia"
				query={{ search: params.search }}
			/>
		</div>
	);
}
