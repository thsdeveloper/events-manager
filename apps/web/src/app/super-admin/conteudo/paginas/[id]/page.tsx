import { notFound } from 'next/navigation';
import { fetchCmsPage, fetchCmsPageActivity } from '@/features/cms/api/server';
import { PageEditor } from '@/features/cms/components/PageEditor';
import { resolvePublicSiteUrl } from '@/features/cms/lib/site-url';
import { BackendRequestError } from '@/lib/backend-auth';

interface PageEditorRouteProps {
	params: Promise<{ id: string }>;
}

export default async function PageEditorRoute({ params }: PageEditorRouteProps) {
	const { id } = await params;
	try {
		const [page, activity, siteUrl] = await Promise.all([
			fetchCmsPage(id),
			fetchCmsPageActivity(id),
			resolvePublicSiteUrl(),
		]);

		return <PageEditor page={page} activity={activity.data} siteUrl={siteUrl} />;
	} catch (error) {
		if (error instanceof BackendRequestError && error.status === 404) notFound();
		throw error;
	}
}
