import { PlatformWrite } from '@/features/platform-access/PlatformPermissions';
import { canOpenPlatformPage } from '@/features/platform-access/server';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { PageHeader } from '@/components/design-system/molecules/PageHeader';
import { fetchBrandingSettings } from '@/features/super-admin/api/server';
import { BrandingSettingsForm } from '@/features/super-admin/components/BrandingSettingsForm';

export default async function BrandingSettingsPage() {
	if (!(await canOpenPlatformPage('/super-admin/identidade-visual'))) return <AccessDenied scope="platform" />;

	const { settings } = await fetchBrandingSettings();

	return (
		<div className="space-y-6">
			<PageHeader
				eyebrow="Identidade da plataforma"
				title="Identidade visual"
				description="Configure as logos em SVG, os favicons do site e as versões dos ícones de aplicativo."
			/>
			<PlatformWrite permission="platform_branding.update">
				<BrandingSettingsForm initialSettings={settings} />
			</PlatformWrite>
		</div>
	);
}
