import { Suspense } from 'react';
import { fetchCmsPages } from '@/features/cms/api/server';
import { CmsPageHeader } from '@/features/cms/components/CmsPageHeader';
import { ListToolbar } from '@/features/cms/components/ListToolbar';
import { NewPageButton, PagesList } from '@/features/cms/components/PagesList';
import { PaginationLinks } from '@/features/cms/components/PaginationLinks';

interface PagesIndexProps {
	searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}

export default async function PagesIndexPage({ searchParams }: PagesIndexProps) {
	const params = await searchParams;
	const result = await fetchCmsPages({
		page: Number(params.page ?? 1),
		search: params.search,
		status: params.status,
		limit: 20,
	});

	return (
		<div className="space-y-6">
			<CmsPageHeader
				title="Páginas"
				description="Cada página é montada com blocos e publicada em um permalink. A página inicial responde na raiz do site."
				actions={<NewPageButton />}
			/>
			<Suspense>
				<ListToolbar />
			</Suspense>
			<PagesList pages={result.data} />
			<PaginationLinks
				pagination={result.pagination}
				pathname="/super-admin/conteudo/paginas"
				query={{ search: params.search, status: params.status }}
			/>
		</div>
	);
}
