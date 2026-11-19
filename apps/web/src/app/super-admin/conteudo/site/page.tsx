import { canOpenPlatformPage } from '@/features/platform-access/server';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { fetchCmsSiteSettings } from '@/features/cms/api/server';
import { CmsPageHeader } from '@/features/cms/components/CmsPageHeader';
import { SiteSettingsForm } from '@/features/cms/components/SiteSettingsForm';

export default async function SiteSettingsPage() {
	if (!(await canOpenPlatformPage('/super-admin/conteudo/site'))) return <AccessDenied scope="platform" />;

	const settings = await fetchCmsSiteSettings();

	return (
		<div className="space-y-6">
			<CmsPageHeader
				title="Site e SEO"
				description="Identidade do site público: nome, descrição padrão, cor de destaque, logos, favicon e redes sociais."
			/>
			<SiteSettingsForm settings={settings} />
		</div>
	);
}
