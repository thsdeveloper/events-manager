import { PageHeader } from '@/components/design-system/molecules/PageHeader';
import { fetchPaymentSettings } from '@/features/super-admin/api/server';
import { PaymentSettingsForm } from '@/features/super-admin/components/PaymentSettingsForm';

export default async function PaymentSettingsPage() {
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
			<PaymentSettingsForm initialSettings={data.settings} runtimeProvider={data.runtimeProvider} />
		</div>
	);
}
