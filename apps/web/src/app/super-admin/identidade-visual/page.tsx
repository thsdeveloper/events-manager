import { PageHeader } from '@/components/design-system/molecules/PageHeader';
import { fetchBrandingSettings } from '@/features/super-admin/api/server';
import { BrandingSettingsForm } from '@/features/super-admin/components/BrandingSettingsForm';

export default async function BrandingSettingsPage() {
	const { settings } = await fetchBrandingSettings();

	return (
		<div className="space-y-6">
			<PageHeader
				eyebrow="Identidade da plataforma"
				title="Identidade visual"
				description="Configure as logos em SVG, os favicons do site e as versões dos ícones de aplicativo."
			/>
			<BrandingSettingsForm initialSettings={settings} />
		</div>
	);
}
