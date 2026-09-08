import { PostEditor } from '@/features/cms/components/PostEditor';
import { resolvePublicSiteUrl } from '@/features/cms/lib/site-url';

export default async function NewPostPage() {
	const siteUrl = await resolvePublicSiteUrl();

	return <PostEditor post={null} siteUrl={siteUrl} />;
}
