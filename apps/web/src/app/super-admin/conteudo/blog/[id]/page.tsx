import { notFound } from 'next/navigation';
import { fetchCmsPost } from '@/features/cms/api/server';
import { PostEditor } from '@/features/cms/components/PostEditor';
import { resolvePublicSiteUrl } from '@/features/cms/lib/site-url';
import { BackendRequestError } from '@/lib/backend-auth';

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	try {
		const [post, siteUrl] = await Promise.all([fetchCmsPost(id), resolvePublicSiteUrl()]);

		return <PostEditor post={post} siteUrl={siteUrl} />;
	} catch (error) {
		if (error instanceof BackendRequestError && error.status === 404) notFound();
		throw error;
	}
}
