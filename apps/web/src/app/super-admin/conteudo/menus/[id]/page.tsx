import { notFound } from 'next/navigation';
import { fetchCmsNavigation } from '@/features/cms/api/server';
import { CmsPageHeader } from '@/features/cms/components/CmsPageHeader';
import { NavigationDangerZone } from '@/features/cms/components/NavigationDangerZone';
import { PROTECTED_NAVIGATIONS } from '@/features/cms/components/NavigationsList';
import { NavigationTree } from '@/features/cms/components/NavigationTree';
import { BackendRequestError } from '@/lib/backend-auth';

export default async function MenuEditorPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	try {
		const navigation = await fetchCmsNavigation(id);
		const title = PROTECTED_NAVIGATIONS[navigation.id] ?? navigation.title;

		return (
			<div className="space-y-6">
				<CmsPageHeader
					eyebrow="Menus"
					title={title}
					description={`Identificador: ${navigation.id}. A ordem abaixo é a ordem no site.`}
				/>
				<NavigationTree navigation={navigation} />
				<NavigationDangerZone navigationId={navigation.id} title={title} />
			</div>
		);
	} catch (error) {
		if (error instanceof BackendRequestError && error.status === 404) notFound();
		throw error;
	}
}
