import { canOpenPlatformPage } from '@/features/platform-access/server';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { PostEditor } from '@/features/cms/components/PostEditor';
import { resolvePublicSiteUrl } from '@/features/cms/lib/site-url';

export default async function NewPostPage() {
	if (!(await canOpenPlatformPage('/super-admin/conteudo/blog/novo'))) return <AccessDenied scope="platform" />;

	const siteUrl = await resolvePublicSiteUrl();

	return <PostEditor post={null} siteUrl={siteUrl} />;
}
