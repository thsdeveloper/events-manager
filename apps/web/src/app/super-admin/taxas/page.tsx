import { PlatformWrite } from '@/features/platform-access/PlatformPermissions';
import { canOpenPlatformPage } from '@/features/platform-access/server';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { PageHeader } from '@/components/design-system/molecules/PageHeader';
import { fetchPaymentSettings } from '@/features/super-admin/api/server';
import { PaymentSettingsForm } from '@/features/super-admin/components/PaymentSettingsForm';

export default async function PaymentSettingsPage() {
	if (!(await canOpenPlatformPage('/super-admin/taxas'))) return <AccessDenied scope="platform" />;

	const data = await fetchPaymentSettings();

	return (
		<div className="space-y-6">
			<PageHeader
				eyebrow="Configurações financeiras"
				title="Taxas e gateway"
				description={
					<>
						{' '}
						Centralize a política de preços, acompanhe os custos atuais do AbacatePay e controle quando repasses reais
						podem ser enviados.{' '}
					</>
				}
			/>
			<PlatformWrite permission="platform_settings.update">
				<PaymentSettingsForm initialSettings={data.settings} runtimeProvider={data.runtimeProvider} />
			</PlatformWrite>
		</div>
	);
}
