import { fetchCmsRedirects } from '@/features/cms/api/server';
import { CmsPageHeader } from '@/features/cms/components/CmsPageHeader';
import { RedirectsManager } from '@/features/cms/components/RedirectsManager';

export default async function RedirectsPage() {
	const { data } = await fetchCmsRedirects();

	return (
		<div className="space-y-6">
			<CmsPageHeader
				title="Redirecionamentos"
				description="Mantenha links antigos funcionando. Use 301 quando a mudança for definitiva; buscadores transferem a relevância para o novo endereço."
			/>
			<RedirectsManager redirects={data} />
		</div>
	);
}
