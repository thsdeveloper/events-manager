import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { fetchCmsPosts } from '@/features/cms/api/server';
import { CmsPageHeader } from '@/features/cms/components/CmsPageHeader';
import { ListToolbar } from '@/features/cms/components/ListToolbar';
import { PaginationLinks } from '@/features/cms/components/PaginationLinks';
import { PostsList } from '@/features/cms/components/PostsList';

interface BlogIndexProps {
	searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}

export default async function BlogIndexPage({ searchParams }: BlogIndexProps) {
	const params = await searchParams;
	const result = await fetchCmsPosts({
		page: Number(params.page ?? 1),
		search: params.search,
		status: params.status,
		limit: 20,
	});

	return (
		<div className="space-y-6">
			<CmsPageHeader
				title="Blog"
				description="Posts publicados aparecem em /blog e no bloco “Posts do blog” das páginas."
				actions={
					<Button asChild>
						<Link href="/super-admin/conteudo/blog/novo">
							<Plus className="mr-2 size-4" />
							Novo post
						</Link>
					</Button>
				}
			/>
			<Suspense>
				<ListToolbar />
			</Suspense>
			<PostsList posts={result.data} />
			<PaginationLinks
				pagination={result.pagination}
				pathname="/super-admin/conteudo/blog"
				query={{ search: params.search, status: params.status }}
			/>
		</div>
	);
}
