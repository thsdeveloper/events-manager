import { Newspaper } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { fetchCmsOverview } from '@/features/cms/api/server';
import { CmsOverview } from '@/features/cms/components/CmsOverview';
import { CmsPageHeader } from '@/features/cms/components/CmsPageHeader';
import { NewPageButton } from '@/features/cms/components/PagesList';

export default async function ContentOverviewPage() {
	const overview = await fetchCmsOverview();

	return (
		<div className="space-y-8">
			<CmsPageHeader
				title="Visão do conteúdo"
				description="Páginas, blog, menus, formulários e mídia do site público em um só lugar. Tudo o que é publicado aqui aparece no site sem esperar."
				actions={
					<>
						<Button variant="outline" asChild>
							<Link href="/super-admin/conteudo/blog/novo">
								<Newspaper className="mr-2 size-4" />
								Novo post
							</Link>
						</Button>
						<NewPageButton />
					</>
				}
			/>
			<CmsOverview data={overview} />
		</div>
	);
}
