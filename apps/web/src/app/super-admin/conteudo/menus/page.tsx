import { fetchCmsNavigations } from '@/features/cms/api/server';
import { CmsPageHeader } from '@/features/cms/components/CmsPageHeader';
import { NavigationsList } from '@/features/cms/components/NavigationsList';

export default async function MenusPage() {
	const { data } = await fetchCmsNavigations();

	return (
		<div className="space-y-6">
			<CmsPageHeader
				title="Menus"
				description="A navegação principal aparece no cabeçalho do site e o rodapé, no fim de cada página. Cada item pode ter um nível de subitens."
			/>
			<NavigationsList navigations={data} />
		</div>
	);
}
